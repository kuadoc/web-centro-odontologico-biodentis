import { Builder, By, until, type WebDriver, type WebElement } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const TIMEOUT = 15_000;

function testPassword(name: string): string {
  const value = process.env[name] || process.env.E2E_PASSWORD || process.env.SEED_DEMO_PASSWORD;
  if (!value) throw new Error(`Configura ${name} o E2E_PASSWORD para ejecutar la prueba.`);
  return value;
}

const USERS = {
  patient: { email: process.env.E2E_PATIENT_EMAIL || "paciente@biodentis.com", password: testPassword("E2E_PATIENT_PASSWORD") },
  reception: { email: process.env.E2E_RECEPTION_EMAIL || "recepcion@biodentis.com", password: testPassword("E2E_RECEPTION_PASSWORD") },
  dentist: { email: process.env.E2E_DENTIST_EMAIL || "dr.martinez@biodentis.com", password: testPassword("E2E_DENTIST_PASSWORD") },
};

const PATIENT_NAME = process.env.E2E_PATIENT_NAME || "Ana López";
const DENTIST_NAME = process.env.E2E_DENTIST_NAME || "Martínez";
const SYMPTOMS = "Dolor intenso en molar inferior, sensibilidad al frío y calor, posible endodoncia";
const DIAGNOSIS = "Pulpitis irreversible en pieza 36";
const TREATMENT = "Tratamiento de conducto (endodoncia) en pieza 36";

const log = (step: number, msg: string) => console.log(` ✓ [Selenium] Paso ${step} completado: ${msg}`);

// Configuración de la carpeta de evidencias
const EVIDENCIAS_DIR = path.join(process.cwd(), 'tests', 'e2e', 'evidencias');
if (!fs.existsSync(EVIDENCIAS_DIR)) {
  fs.mkdirSync(EVIDENCIAS_DIR, { recursive: true });
}

// Estado compartido entre fases: horario reservado en la fase 1.
let bookedSlot = "";
let driver: WebDriver;

const xp = (s: string) => By.xpath(s);

// Función para tomar y guardar la captura
async function takeSnapshot(stepName: string): Promise<void> {
  const image = await driver.takeScreenshot();
  const filePath = path.join(EVIDENCIAS_DIR, `${stepName}.png`);
  fs.writeFileSync(filePath, image, "base64");
  console.log(` ✓ [Evidencia] Captura guardada: evidencias/${stepName}.png`);
}

async function waitVisible(locator: By, timeout = TIMEOUT): Promise<WebElement> {
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

async function click(locator: By): Promise<void> {
  const el = await waitVisible(locator);
  await driver.wait(until.elementIsEnabled(el), TIMEOUT);
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", el);
  await el.click();
}

async function type(locator: By, text: string): Promise<void> {
  const el = await waitVisible(locator);
  await el.clear();
  await el.sendKeys(text);
}

async function login(email: string, password: string): Promise<void> {
  await driver.get(`${BASE_URL}/login`);
  await type(By.id("email"), email);
  await type(By.id("password"), password);
  await click(xp("//button[@type='submit']"));
  await driver.wait(
    async () => !(await driver.getCurrentUrl()).includes("/login"),
    TIMEOUT,
    "El login no redirigió al panel",
  );
}

async function logout(): Promise<void> {
  await click(By.css("[aria-label='Cerrar sesión']"));
  await driver.wait(until.urlContains("/login"), TIMEOUT, "El logout no redirigió a /login");
}

async function openAppointments(): Promise<void> {
  await driver.get(`${BASE_URL}/appointments`);
  await waitVisible(xp("//h2[normalize-space()='Citas']"));
}

/** Fila de la tabla de escritorio de la cita reservada en la fase 1. */
function appointmentRow(status: string): By {
  return xp(
    `//table//tr[contains(., '${PATIENT_NAME}') and contains(., '${DENTIST_NAME}') and contains(., '${bookedSlot}') and contains(., '${status}')]`,
  );
}

async function filterByDentist(): Promise<void> {
  await type(By.css("input[aria-label='Buscar por odontólogo']"), DENTIST_NAME);
}

/** Fija el valor de un <input type=date> disparando los eventos que React escucha. */
async function setDate(iso: string): Promise<void> {
  const input = await waitVisible(xp("//label[contains(.,'Fecha')]/following::input[@type='date'][1]"));
  await driver.executeScript(
    `const el = arguments[0];
     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, arguments[1]);
     el.dispatchEvent(new Event('input', { bubbles: true }));
     el.dispatchEvent(new Event('change', { bubbles: true }));`,
    input,
    iso,
  );
}

const SLOT = By.css("[role='radiogroup'] button[role='radio']");

/** Recorre los próximos días hasta encontrar uno con horarios libres. */
async function selectFirstFreeSlot(): Promise<string> {
  for (let offset = 1; offset <= 21; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const iso = d.toISOString().slice(0, 10);
    await setDate(iso);
    try {
      await driver.wait(until.elementLocated(SLOT), 4000);
      const first = (await driver.findElements(SLOT))[0]!;
      const text = (await first.getText()).trim();
      await first.click();
      await driver.wait(async () => (await first.getAttribute("aria-checked")) === "true", TIMEOUT);
      console.log(`✓ [Selenium] Fecha ${iso} con horarios libres; horario elegido: ${text}`);
      return text;
    } catch {
      // sin horarios ese día, probar el siguiente
    }
  }
  throw new Error("No se encontró ningún horario libre en los próximos 21 días");
}

describe("Módulo de Citas - Camino Feliz (E2E)", function () {
  this.timeout(180_000);

  before(async () => {
    const options = new chrome.Options();
    options.addArguments("--window-size=1440,900");
    if (process.env.HEADLESS !== "false") options.addArguments("--headless=new");
    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  });

  after(async () => {
    await driver?.quit();
  });

  it("Fase 1: Paciente crea una cita y queda en estado PENDING", async () => {
    await login(USERS.patient.email, USERS.patient.password);
    log(1, `Login de paciente (${USERS.patient.email})`);
    await takeSnapshot('Fase1-01-LoginPaciente');

    await openAppointments();
    await click(xp("//button[contains(., 'Nueva Cita')]"));
    await waitVisible(xp("//form//label[contains(.,'Odontólogo')]"));
    log(2, "Formulario de Nueva Cita abierto");
    await takeSnapshot('Fase1-02-FormularioAbierto');

    const select = await waitVisible(xp("//label[contains(.,'Odontólogo')]/following::select[1]"));
    await (await select.findElement(xp(`.//option[contains(., '${DENTIST_NAME}')]`))).click();
    log(3, `Odontólogo seleccionado: Dr. ${DENTIST_NAME}`);

    bookedSlot = await selectFirstFreeSlot();
    log(4, `Primera tarjeta de horario libre seleccionada (${bookedSlot})`);

    await type(xp("//label[contains(.,'Notas')]/following::input[1]"), SYMPTOMS);
    log(5, "Síntomas de endodoncia ingresados");
    await takeSnapshot('Fase1-03-FormularioLleno');

    await click(xp("//button[@type='submit' and contains(., 'Crear Cita')]"));
    await driver.wait(until.elementLocated(appointmentRow("Pendiente")), TIMEOUT, "La cita creada no aparece como Pendiente");
    log(6, "Cita creada y validado estado PENDING (Pendiente)");
    await takeSnapshot('Fase1-04-CitaPendienteTabla');

    await logout();
    log(7, "Logout de paciente");
  });

  it("Fase 2: Recepción confirma la cita y queda en estado CONFIRMED", async () => {
    assert.ok(bookedSlot, "La fase 1 debe haber reservado un horario");

    await login(USERS.reception.email, USERS.reception.password);
    log(1, `Login de recepción (${USERS.reception.email})`);

    await openAppointments();
    await filterByDentist();
    const row = await driver.wait(
      until.elementLocated(appointmentRow("Pendiente")),
      TIMEOUT,
      `No se halló la cita de ${PATIENT_NAME}`,
    );
    log(2, `Cita de ${PATIENT_NAME} localizada (${bookedSlot})`);
    await takeSnapshot('Fase2-01-CitaPendienteLocalizada');

    await row.findElement(By.css("[aria-label='Confirmar cita']")).then((b) => b.click());
    log(3, "Clic en Confirmar");

    await driver.wait(until.elementLocated(appointmentRow("Confirmada")), TIMEOUT, "La cita no pasó a Confirmada");
    log(4, "Validado estado CONFIRMED (Confirmada)");
    await takeSnapshot('Fase2-02-CitaConfirmadaTabla');

    await logout();
    log(5, "Logout de recepción");
  });

  it("Fase 3: Dentista registra la nota clínica y completa la cita (COMPLETED)", async () => {
    assert.ok(bookedSlot, "La fase 1 debe haber reservado un horario");

    await login(USERS.dentist.email, USERS.dentist.password);
    log(1, `Login de dentista (${USERS.dentist.email})`);

    await openAppointments();
    const row = await driver.wait(
      until.elementLocated(appointmentRow("Confirmada")),
      TIMEOUT,
      `No se halló la cita confirmada de ${PATIENT_NAME}`,
    );
    
    await row.findElement(By.css("[aria-label='Ver detalle de la cita']")).then((b) => b.click());
    await waitVisible(xp("//*[contains(text(),'Detalle de la cita')]"));
    log(2, `Detalle de la cita de ${PATIENT_NAME} abierto`);
    await takeSnapshot('Fase3-01-DetalleCitaAbierto');

    await waitVisible(xp("//*[contains(text(),'Registro de nota clínica')]"));
    await type(By.id("clinical-diagnosis"), DIAGNOSIS);
    await type(By.id("clinical-treatment"), TREATMENT);
    log(3, "Diagnóstico y Tratamiento llenados en la nota clínica");
    await takeSnapshot('Fase3-02-NotaClinicaLlenada');

    await click(xp("//button[contains(., 'Guardar y completar')]"));
    await click(xp("//button[contains(., 'Confirmar y completar')]"));
    log(4, "Clic en Guardar y Completar");

    // El diálogo se cierra al guardar y la fila pasa a Completada.
    await driver.wait(until.elementLocated(appointmentRow("Completada")), TIMEOUT, "La cita no pasó a Completada");
    log(5, "Validado estado COMPLETED (Completada)");
    await takeSnapshot('Fase3-03-CitaCompletadaTabla');
  });
});
