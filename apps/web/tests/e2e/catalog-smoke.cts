import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { writeFile } from "node:fs/promises"
import { Builder, By, until } from "selenium-webdriver"
import chrome from "selenium-webdriver/chrome"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

async function main() {
  const password = randomUUID()
  const hash = await bcrypt.hash(password, 10)
  const users = await Promise.all(
    (["ADMIN", "RECEPTIONIST"] as const).map((role) =>
      prisma.user.create({
        data: {
          email: `catalog-smoke-${role}-${randomUUID()}@example.test`,
          passwordHash: hash,
          role,
          firstName: "Prueba",
          lastName: "Catálogo",
        },
      })
    )
  )
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(
      new chrome.Options().addArguments(
        "--headless=new",
        "--disable-gpu",
        "--window-size=1440,1000"
      )
    )
    .build()
  try {
    const admin = users[0]!
    await driver.get("http://localhost:3000/login?callbackUrl=/dentists")
    await driver.findElement(By.id("email")).sendKeys(admin.email)
    await driver.findElement(By.id("password")).sendKeys(password)
    await driver.findElement(By.css("button[type=submit]")).click()
    await driver.wait(
      until.elementLocated(
        By.xpath("//h1[text()='Especialidades y servicios']")
      ),
      25_000
    )
    await driver.wait(
      until.elementLocated(By.css("nav[aria-label=Especialidades] button")),
      15_000
    )
    assert.ok(
      (
        await driver.findElements(
          By.css("nav[aria-label=Especialidades] button")
        )
      ).length >= 9
    )
    await driver
      .findElement(By.xpath("//button[contains(.,'Nueva especialidad')]"))
      .click()
    await driver.wait(until.elementLocated(By.id("catalog-name")), 5000)
    await driver.findElement(By.xpath("//button[text()='Guardar']")).click()
    await driver.wait(
      until.elementLocated(By.css("#catalog-name[aria-invalid=true]")),
      5000
    )
    await driver.findElement(By.xpath("//button[text()='Cancelar']")).click()
    await driver
      .findElement(By.xpath("//button[contains(.,'Agregar servicio')]"))
      .click()
    await driver.wait(until.elementLocated(By.id("catalog-duration")), 5000)
    await driver
      .findElement(By.id("catalog-name"))
      .sendKeys("Prueba sin guardar")
    await driver.findElement(By.id("catalog-duration")).clear()
    await driver.findElement(By.id("catalog-duration")).sendKeys("16")
    await driver.findElement(By.xpath("//button[text()='Guardar']")).click()
    await driver.wait(
      until.elementLocated(By.css("#catalog-duration[aria-invalid=true]")),
      5000
    )
    await driver.findElement(By.xpath("//button[text()='Cancelar']")).click()
    await driver
      .findElement(By.xpath("//button[contains(.,'Asignar odontólogos')]"))
      .click()
    await driver.wait(
      until.elementLocated(By.css("[role=dialog] input[type=checkbox]")),
      5000
    )
    await driver.findElement(By.xpath("//button[text()='Cancelar']")).click()
    for (const [width, height] of [
      [1440, 1000],
      [768, 1000],
      [375, 812],
    ]) {
      await driver.manage().window().setRect({ width, height })
      assert.equal(
        await driver.executeScript(
          "return document.documentElement.scrollWidth <= window.innerWidth"
        ),
        true,
        `Sin desbordamiento a ${width}px`
      )
      if (width === 1440)
        await writeFile(
          ".next/catalog-desktop.png",
          await driver.takeScreenshot(),
          "base64"
        )
    }
    const forbidden = await driver.executeAsyncScript<{ status: number }>(
      "const done = arguments[arguments.length - 1]; fetch('/api/catalog').then(r=>done({status:r.status}));"
    )
    assert.equal(forbidden.status, 401, "La API rechaza peticiones sin token")
    await driver.executeScript("localStorage.clear()")
    await driver.get("http://localhost:3000/login?callbackUrl=/dentists")
    await driver.findElement(By.id("email")).sendKeys(users[1]!.email)
    await driver.findElement(By.id("password")).sendKeys(password)
    await driver.findElement(By.css("button[type=submit]")).click()
    await driver.wait(
      until.elementLocated(
        By.xpath("//*[@role='alert' and contains(.,'Solo el administrador')]")
      ),
      15_000
    )
    const restricted = await driver.executeAsyncScript<{ status: number }>(
      "const done = arguments[arguments.length - 1]; fetch('/api/catalog',{headers:{Authorization:'Bearer '+localStorage.getItem('accessToken')}}).then(r=>done({status:r.status}));"
    )
    assert.equal(restricted.status, 403)
    assert.equal(
      (await driver.findElements(By.css("nav a[href='/dentists']"))).length,
      0
    )
    console.log(
      "Catálogo: vista, modales, validación, responsive y permisos ADMIN verificados."
    )
  } finally {
    await driver.quit()
    await prisma.auditLog.deleteMany({
      where: { userId: { in: users.map((u) => u.id) } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: users.map((u) => u.id) } },
    })
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
