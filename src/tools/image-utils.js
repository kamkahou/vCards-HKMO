import fs from 'fs'
import sharp from 'sharp'

export const ensure200x200 = async (pngPath) => {
	const buffer = await fs.promises.readFile(pngPath)
	const resized = await sharp(buffer)
		.resize(200, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png({ compressionLevel: 9, quality: 100, palette: true })
		.toBuffer()
	await fs.promises.writeFile(pngPath, resized)
}

export const compressUnder20KB = async (pngPath) => {
	const MAX = 1024 * 20
	const input = await fs.promises.readFile(pngPath)
	let low = 1, high = 100
	let best = null, bestSize = -1
	while (low <= high) {
		const mid = Math.floor((low + high) / 2)
		const out = await sharp(input).png({ compressionLevel: 9, palette: true, quality: mid }).toBuffer()
		const size = out.length
		if (size <= MAX) {
			if (size > bestSize) { best = out; bestSize = size }
			low = mid + 1
		} else {
			high = mid - 1
		}
	}
	if (!best) best = await sharp(input).png({ compressionLevel: 9, palette: true, quality: 1 }).toBuffer()
	await fs.promises.writeFile(pngPath, best)
}


