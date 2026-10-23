import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
const resolve = createRequire(import.meta.url).resolve;
const esbuild = createRequire(resolve("tsx"))("esbuild");

async function main() {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const storage = await fs.mkdtemp(
    path.join(os.tmpdir(), "workwear-regression-"),
  );
  const previousStorage = process.env.STORAGE_DIR;
  const previousMail = process.env.MAIL_TO;
  const previousUser = process.env.SMTP_USER;
  process.env.STORAGE_DIR = storage;
  process.env.MAIL_TO = "fallback@example.test";
  process.env.SMTP_USER = "sender@example.test";
  const state = { events: [], failMail: false };
  globalThis.__workwearRegression = state;
  try {
    const bundle = await esbuild.build({
      stdin: {
        contents:
          'export * from "./lib/operation"; export * from "./lib/excel"; export * from "./lib/mail";',
        resolveDir: repo,
      },
      bundle: true,
      write: false,
      platform: "node",
      format: "cjs",
      packages: "external",
      plugins: [
        {
          name: "isolated-dependencies",
          setup(build) {
            build.onResolve(
              { filter: /node_modules\/nodemailer\// },
              (args) => ({ path: args.path, external: true }),
            );
            build.onResolve({ filter: /^@\/lib\/prisma$/ }, () => ({
              path: "prisma",
              namespace: "fixture",
            }));
            build.onLoad({ filter: /^prisma$/, namespace: "fixture" }, () => ({
              contents:
                "export const prisma = globalThis.__workwearRegression.db;",
            }));
            build.onResolve({ filter: /^nodemailer$/ }, () => ({
              path: "mail",
              namespace: "fixture",
            }));
            build.onLoad({ filter: /^mail$/, namespace: "fixture" }, () => ({
              contents: `
          const actual = require(${JSON.stringify(resolve("nodemailer"))});
          export default { createTransport(options) {
            const state = globalThis.__workwearRegression;
            state.transportOptions = options;
            const transport = actual.createTransport({streamTransport:true,buffer:true,newline:"unix"});
            return { async sendMail(message) {
              state.events.push("mail"); state.message = message;
              if(state.failMail) throw Error("Simulated SMTP failure");
              const result = await transport.sendMail(message);
              state.mime = result.message.toString();
              return result;
            }};
          }};`,
            }));
            build.onResolve({ filter: /^@\// }, (args) => ({
              path: path.join(repo, args.path.slice(2)) + ".ts",
            }));
          },
        },
      ],
    });
    const employee = { fullName: "Тестовый сотрудник" };
    const garments = [
      {
        id: "received",
        barcode: "460000000001",
        status: "in_laundry",
        stationId: "station",
        employeeId: "employee",
        employee,
        garmentType: { name: "Куртка" },
        label: "Уточнение",
      },
      {
        id: "sent",
        barcode: "460000000002",
        status: "with_employee",
        stationId: "station",
        employeeId: "employee",
        employee,
        garmentType: { name: "Футболка" },
        label: "Уточнение",
      },
      {
        id: "new",
        barcode: "460000000003",
        status: "with_employee",
        stationId: "station",
        employeeId: "employee",
        employee,
        garmentType: { name: "Комбинезон" },
        label: "Уточнение",
      },
    ];
    const operation = {
      id: "operation",
      type: "laundry",
      status: "draft",
      stationId: "station",
      employeeId: "employee",
      employee,
      station: {
        name: "Тестовая СТО",
        address: "Тестовый адрес",
        mailTo: "station@example.test",
      },
      operationDate: new Date("2026-10-23T09:00:00Z"),
      attachments: [],
      items: [],
    };
    operation.items = garments
      .slice(0, 2)
      .map((garment, index) => ({
        id: garment.id,
        garmentId: garment.id,
        operationId: operation.id,
        scannedById: "user",
        garment,
        operation,
        direction: index ? "sent_to_laundry" : "received_from_laundry",
        deductionAmount: 0,
      }));
    const db = {
      operation: {
        findUnique: async () => operation,
        update: async ({ data }) => {
          Object.assign(operation, data);
          state.events.push("operation:" + data.status);
        },
      },
      garment: {
        findUnique: async ({ where }) =>
          garments.find((g) => g.barcode === where.barcode),
        update: async ({ where, data }) => {
          Object.assign(
            garments.find((g) => g.id === where.id),
            data,
          );
          state.events.push("garment:" + where.id + ":" + data.status);
        },
      },
      operationItem: {
        findUnique: async ({ where }) =>
          operation.items.find((i) => i.id === where.id),
        findFirst: async ({ where }) =>
          operation.items.find(
            (i) =>
              i.garmentId === where.garmentId &&
              (typeof where.direction === "string"
                ? i.direction === where.direction
                : i.direction !== where.direction.not),
          ),
        create: async ({ data }) => {
          const item = {
            ...data,
            id: data.garmentId,
            garment: garments.find((g) => g.id === data.garmentId),
            operation,
          };
          operation.items.push(item);
          return item;
        },
        delete: async ({ where }) => {
          operation.items = operation.items.filter((i) => i.id !== where.id);
        },
      },
      garmentHistory: {
        create: async () => {
          state.events.push("history");
        },
      },
      attachment: {
        deleteMany: async () => {
          operation.attachments = operation.attachments.filter(
            (a) => a.fileType !== "excel_detail",
          );
        },
        create: async ({ data }) => {
          operation.attachments.push(data);
        },
      },
      $transaction: async (callback) => callback(db),
    };
    state.db = db;
    const compiled = new Module(
      path.join(repo, "scripts", "regression-bundle.cjs"),
    );
    compiled.filename = path.join(repo, "scripts", "regression-bundle.cjs");
    compiled.paths = Module._nodeModulePaths(repo);
    compiled._compile(bundle.outputFiles[0].text, compiled.filename);
    const api = compiled.exports;
    const user = { id: "user", role: "master", stationId: "station" };
    await api.addGarmentToOperation({
      operationId: operation.id,
      barcode: garments[2].barcode,
      direction: "sent_to_laundry",
      user,
    });
    assert.equal(
      garments[2].status,
      "with_employee",
      "draft scans must not change garment status",
    );
    await assert.rejects(
      () =>
        api.addGarmentToOperation({
          operationId: operation.id,
          barcode: garments[2].barcode,
          direction: "sent_to_laundry",
          user,
        }),
      /уже добавлен/,
    );
    await assert.rejects(() =>
      api.addGarmentToOperation({
        operationId: operation.id,
        barcode: garments[2].barcode,
        direction: "sent_to_laundry",
        user: { ...user, stationId: "other" },
      }),
    );
    await api.deleteOperationItem({
      operationId: operation.id,
      itemId: "new",
      user,
    });
    assert.equal(garments[2].status, "with_employee");
    assert.equal(operation.status, "draft");
    const report = await api.generateLaundryExcel(operation.id);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(report.filePath);
    const sheet = workbook.getWorksheet("Стирка");
    assert.equal(sheet.getCell("B6").value, "Тестовый сотрудник, Куртка");
    assert.equal(sheet.getCell("D6").value, "Тестовый сотрудник, Футболка");
    assert.equal(sheet.getCell("C6").value, garments[0].barcode);
    assert.equal(sheet.getCell("D4").fill.fgColor.argb, "FFF4CCCC");
    assert.equal(operation.status, "ready");
    await assert.rejects(
      () => api.sendOperationEmail(operation.id),
      /Не хватает вложений/,
    );
    const actPath = path.join(storage, "act.jpg");
    await fs.writeFile(actPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    operation.attachments.push({
      fileType: "act_photo",
      fileName: "Акт.jpg",
      filePath: actPath,
    });
    state.failMail = true;
    state.events = [];
    await assert.rejects(
      () => api.sendOperationEmail(operation.id),
      /Simulated SMTP failure/,
    );
    assert.equal(operation.status, "ready");
    assert.equal(garments[0].status, "in_laundry");
    assert.equal(garments[1].status, "with_employee");
    assert.deepEqual(state.events, ["mail"]);
    state.failMail = false;
    state.events = [];
    await api.sendOperationEmail(operation.id);
    assert.equal(state.message.to, "station@example.test");
    assert.equal(state.message.attachments.length, 2);
    assert.match(state.mime, /multipart\/mixed/);
    assert.match(
      state.mime,
      /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/,
    );
    assert.equal(state.events[0], "mail");
    assert.equal(state.events.at(-1), "operation:sent");
    assert.equal(garments[0].status, "with_employee");
    assert.equal(garments[1].status, "in_laundry");
    assert.equal(operation.status, "sent");
    await assert.rejects(
      () =>
        api.deleteOperationItem({
          operationId: operation.id,
          itemId: "sent",
          user,
        }),
      /закрыта/,
    );
    await api.sendOperationEmail(operation.id, "override@example.test");
    assert.equal(state.message.to, "override@example.test");
    operation.type = "firing_return";
    operation.status = "draft";
    operation.items = [operation.items[0]];
    operation.items[0].direction = "returned_after_firing";
    const returned = await api.generateReturnExcel(operation.id);
    await workbook.xlsx.readFile(returned.filePath);
    assert.equal(
      workbook.getWorksheet("Возврат").getCell("B6").value,
      "Тестовый сотрудник, Куртка",
    );
    await assert.rejects(
      () => api.sendOperationEmail(operation.id),
      /return_photo/,
    );
    console.log(
      "Passed: draft scan/delete, duplicates, station access, Excel layouts/types/barcodes, MIME attachments, SMTP failure, post-send statuses, completed-document lock and recipient override. No external email sent.",
    );
  } finally {
    delete globalThis.__workwearRegression;
    for (const [key, value] of [
      ["STORAGE_DIR", previousStorage],
      ["MAIL_TO", previousMail],
      ["SMTP_USER", previousUser],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await fs.rm(storage, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
