import fs from 'fs'
import path from 'path'
import { globby } from 'globby'
import sharp from 'sharp'

const TARGET_WIDTH = 200
const TARGET_HEIGHT = 200

const resizePngTo200 = async (pngPath) => {
	const inputBuffer = await fs.promises.readFile(pngPath)
	const outputBuffer = await sharp(inputBuffer)
		.resize(TARGET_WIDTH, TARGET_HEIGHT, {
			fit: 'contain',
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		})
		.png({ compressionLevel: 9, quality: 100, palette: true })
		.toBuffer()

	await fs.promises.writeFile(pngPath, outputBuffer)
}

const main = async () => {
	const pngFiles = await globby('data/*/*.png')
	if (pngFiles.length === 0) {
		console.log('No PNG files found under data/*/*.png')
		return
	}

	let processedCount = 0
	for (const filePath of pngFiles) {
		try {
			await resizePngTo200(filePath)
			const { size } = await fs.promises.stat(filePath)
			console.log(`Resized: ${filePath} -> 200x200, ${size} bytes`)
			processedCount += 1
		} catch (error) {
			console.error(`Failed: ${filePath}`, error.message)
		}
	}
	console.log(`Done. Resized ${processedCount}/${pngFiles.length} images.`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})


