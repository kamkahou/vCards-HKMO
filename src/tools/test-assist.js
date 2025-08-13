import fs from 'fs'
import { globby } from 'globby'
import imageSize from 'image-size'
import prettyBytes from 'pretty-bytes'
import { ensure200x200, compressUnder20KB } from './image-utils.js'

const MAX_BYTES = 1024 * 20

const findViolations = async () => {
	const issues = []
	const pngFiles = await globby('data/*/*.png')
	for (const png of pngFiles) {
		try {
			const { width, height } = imageSize(png)
			const { size } = await fs.promises.stat(png)
			const dimensionBad = width !== 200 || height !== 200
			const sizeBad = size > MAX_BYTES
			if (dimensionBad || sizeBad) {
				issues.push({ png, width, height, size, dimensionBad, sizeBad })
			}
		} catch (e) {
			issues.push({ png, error: e.message })
		}
	}
	return issues
}

const promptYesNo = async (question) => {
	return new Promise((resolve) => {
		process.stdout.write(`${question} [y/N]: `)
		process.stdin.setEncoding('utf8')
		process.stdin.once('data', (data) => {
			const ans = (data || '').trim().toLowerCase()
			resolve(ans === 'y' || ans === 'yes')
		})
	})
}

const main = async () => {
	let issues = await findViolations()
	if (issues.length === 0) {
		console.log('All images passed (200x200 and <= 20KB).')
		return
	}
	console.log('Found issues:')
	for (const it of issues) {
		if (it.error) {
			console.log(`- ${it.png}: ERROR ${it.error}`)
			continue
		}
		console.log(`- ${it.png}: ${it.width}x${it.height}, ${prettyBytes(it.size)}${it.dimensionBad ? ' [DIM]' : ''}${it.sizeBad ? ' [SIZE]' : ''}`)
	}

	const doFix = await promptYesNo('是否要自動修復不合規的圖片（縮放至200x200並壓縮<=20KB）?')
	if (!doFix) {
		console.log('取消自動修復。')
		process.exit(1)
		return
	}

	for (const it of issues) {
		if (it.error) continue
		if (it.dimensionBad) {
			await ensure200x200(it.png)
		}
		// 無論是否剛縮放，都跑一次壓縮
		await compressUnder20KB(it.png)
	}

	// re-check
	issues = await findViolations()
	if (issues.length === 0) {
		console.log('修復完成，所有圖片已符合要求。')
		process.exit(0)
	} else {
		console.log('仍有不合規的圖片：')
		for (const it of issues) {
			if (it.error) {
				console.log(`- ${it.png}: ERROR ${it.error}`)
				continue
			}
			console.log(`- ${it.png}: ${it.width}x${it.height}, ${prettyBytes(it.size)}${it.dimensionBad ? ' [DIM]' : ''}${it.sizeBad ? ' [SIZE]' : ''}`)
		}
		process.exit(2)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})


