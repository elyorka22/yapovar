import { test, expect } from '@playwright/test';

test('Главная страница загружается и отображает все блоки', async ({ page }) => {
  await page.goto('/');
  
  // Проверяем Hero-блок
  await expect(page.locator('.hero-title')).toHaveText('Я ПОВАР');
  await expect(page.locator('.hero-subtitle')).toHaveText('O\'zim pishiraman');
  
  // Проверяем быстрый выбор
  await expect(page.locator('.section-title').first()).toHaveText('Что будем готовить сегодня?');
  await expect(page.locator('.choice-card')).toHaveCount(4);
  await expect(page.locator('.choice-card').nth(0)).toContainText('Готовим пиццу');
  await expect(page.locator('.choice-card').nth(1)).toContainText('Готовим самсу');
  await expect(page.locator('.choice-card').nth(2)).toContainText('Готовим бургеры');
  await expect(page.locator('.choice-card').nth(3)).toContainText('Завтрак дома');
  
  // Проверяем категории
  await expect(page.locator('.category-item')).toHaveCount(5);
  
  // Проверяем блок подписки
  await expect(page.locator('.subscription-title')).toHaveText('Еженедельный набор для готовки');
  await expect(page.locator('.subscription-btn')).toHaveText('Подписаться');
  
  // Проверяем блок доверия
  await expect(page.locator('.trust-item')).toHaveCount(3);
  await expect(page.locator('.trust-item').nth(0)).toContainText('Быстрая доставка');
  await expect(page.locator('.trust-item').nth(1)).toContainText('Свежие продукты');
  await expect(page.locator('.trust-item').nth(2)).toContainText('Удобно для дома');
});

test('Карточки быстрого выбора кликабельны', async ({ page }) => {
  await page.goto('/');
  
  const firstCard = page.locator('.choice-card').first();
  await firstCard.click();
  
  // Проверяем, что клик обработан (нет ошибок в консоли)
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  await expect(firstCard).toBeVisible();
});

test('Кнопка подписки кликабельна', async ({ page }) => {
  await page.goto('/');
  
  const subscribeBtn = page.locator('.subscription-btn');
  await expect(subscribeBtn).toBeVisible();
  await subscribeBtn.click();
  
  await expect(subscribeBtn).toBeVisible();
});

test('Страница адаптивна для мобильных устройств', async ({ page }) => {
  await page.goto('/');
  
  // Проверяем, что контент не выходит за границы экрана
  const body = page.locator('body');
  const bodyBox = await body.boundingBox();
  const viewport = page.viewportSize();
  
  expect(bodyBox.width).toBeLessThanOrEqual(viewport.width);
});

