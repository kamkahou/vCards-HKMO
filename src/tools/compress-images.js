import fs from 'fs'
import path from 'path'
import { globby } from 'globby'
import sharp from 'sharp'

const MAX_SIZE_BYTES = 1024 * 20

const compressPngToTarget = async (inputBuffer) => {
	// Binary search on quality [1, 100]
	let low = 1
	let high = 100
	let bestBuffer = null
	let bestSize = -1

	while (low <= high) {
		const mid = Math.floor((low + high) / 2)
		const candidate = await sharp(inputBuffer)
			.png({ compressionLevel: 9, palette: true, quality: mid })
			.toBuffer()
		const candidateSize = candidate.length

		if (candidateSize <= MAX_SIZE_BYTES) {
			// feasible, keep the largest under limit
			if (candidateSize > bestSize) {
				bestBuffer = candidate
				bestSize = candidateSize
			}
			low = mid + 1
		} else {
			high = mid - 1
		}
	}

	if (bestBuffer) return bestBuffer

	// If even quality=1 is too large, fall back to strongest compression
	return await sharp(inputBuffer)
		.png({ compressionLevel: 9, palette: true, quality: 1 })
		.toBuffer()
}

const processFile = async (pngPath) => {
	const original = await fs.promises.readFile(pngPath)
	const compressed = await compressPngToTarget(original)
	await fs.promises.writeFile(pngPath, compressed)
	return { before: original.length, after: compressed.length }
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
			const { before, after } = await processFile(filePath)
			const status = after <= MAX_SIZE_BYTES ? 'OK' : '>LIMIT'
			console.log(`Compressed: ${filePath} ${status} ${before} -> ${after} bytes`)
			processedCount += 1
		} catch (error) {
			console.error(`Failed: ${filePath}`, error.message)
		}
	}
	console.log(`Done. Compressed ${processedCount}/${pngFiles.length} images.`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})


