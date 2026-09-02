import { open, readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const archive = JSON.parse(await readFile(path.join(root, 'src', 'data', 'archive.json'), 'utf8'))
const manifest = JSON.parse(await readFile(path.join(root, 'outputs', 'desktop-photo-selection-50.json'), 'utf8'))
const imageDir = path.join(root, 'public', 'images', 'family-archive')
const files = (await readdir(imageDir)).filter((name) => /^memory-\d{2}\.(?:jpg|png)$/u.test(name)).sort()
const primaryCards = archive.cards.filter((card) => card.number <= 50)
const coverPaths = primaryCards.map((card) => card.coverImage?.src)
const turkeyCardIds = new Set(Array.from({ length: 8 }, (_, index) => `memory-${String(index + 25).padStart(3, '0')}`))

const assertions = [
  [manifest.length === 50, `манифест: ${manifest.length}/50`],
  [files.length === 50, `активные изображения JPG/PNG: ${files.length}/50`],
  [primaryCards.length === 50, `основные карточки: ${primaryCards.length}/50`],
  [primaryCards[0]?.coverImage?.src === '/images/family-archive/memory-01.jpg', 'чёрно-белый снимок стоит первым'],
  [primaryCards[0]?.effects?.includes('vintage-photo'), 'у первого снимка включён эффект старой фотографии'],
  [primaryCards[49]?.coverImage?.src === '/images/family-archive/memory-50.jpg', 'взрослый совместный портрет стоит пятидесятым'],
  [primaryCards[49]?.title === 'Даже когда я стану взрослым', 'сохранён обязательный заголовок карточки №50'],
  [archive.cards[50]?.unlock?.cardId === 'memory-050', 'карточка №51 открывается только после №50'],
  [coverPaths.every(Boolean), 'у каждой карточки есть основное фото'],
  [new Set(coverPaths).size === 50, `уникальные пути карточек: ${new Set(coverPaths).size}/50`],
  [primaryCards.every((card) => card.coverImage?.alt?.trim()), 'у каждой фотографии есть alt'],
  [primaryCards.every((card) => card.text?.trim()), 'у каждой карточки есть послание'],
  [primaryCards.every((card) => card.status === 'ready'), 'все подтверждённые карточки готовы к публикации'],
  [!primaryCards.some((card) => `${card.title} ${card.text} ${card.location ?? ''}`.includes('Элефант')), 'ошибочное название «Элефант» удалено'],
  [primaryCards.some((card) => `${card.title} ${card.text} ${card.location ?? ''}`.includes('Капитоли')), 'добавлено воспоминание о кино в «Капитолии»'],
  [primaryCards.some((card) => `${card.title} ${card.text} ${card.location ?? ''}`.includes('Додо Пицц')), 'добавлено открытие «Додо Пиццы»'],
  [primaryCards.filter((card) => turkeyCardIds.has(card.id)).every((card) => card.text.toLowerCase().includes('пап')), 'вся турецкая поездка описана как путешествие мамы с папой'],
  [primaryCards.some((card) => card.text.includes('Помнишь, как мы с тобой смеялись')), 'в архиве есть фраза о совместном смехе'],
]

for (const filename of files) {
  const filePath = path.join(imageDir, filename)
  const file = await open(filePath, 'r')
  const header = Buffer.alloc(8)
  await file.read(header, 0, 8, 0)
  await file.close()
  const info = await stat(filePath)
  const validJpeg = filename.endsWith('.jpg')
    && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
  const validPng = filename.endsWith('.png')
    && header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  assertions.push([
    (validJpeg || validPng) && info.size > 20_000,
    `${filename}: корректное изображение, ${info.size} байт`,
  ])
}

const failed = assertions.filter(([ok]) => !ok)
for (const [ok, message] of assertions) {
  console.log(`${ok ? '✓' : '✗'} ${message}`)
}

if (failed.length > 0) {
  process.exitCode = 1
} else {
  console.log('Проверка завершена: набор из 50 фотографий и посланий готов к просмотру.')
}
