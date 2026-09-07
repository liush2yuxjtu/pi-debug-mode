#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, sep } from 'node:path'

/** @typedef {'local' | 'tagged' | 'published'} VerifyMode */
/** @typedef {'pass' | 'fail' | 'warn'} CheckStatus */

/**
 * @typedef {object} ReleaseIdentity
 * @property {string} packageName
 * @property {string} version
 * @property {string} tagName
 * @property {string} repository
 * @property {string} owner
 * @property {string} repo
 * @property {string} pagesBase
 */

/**
 * @typedef {object} PublicSurface
 * @property {string} id
 * @property {'git-tag' | 'pages-main' | 'npm-registry' | 'pi-gallery'} owner
 * @property {string} url
 * @property {VerifyMode[]} phases
 * @property {string | undefined} [localPath]
 * @property {'html' | 'json' | 'image' | 'video'} contentKind
 */

/**
 * @typedef {object} VerificationCheck
 * @property {string} id
 * @property {CheckStatus} status
 * @property {string} detail
 */

/**
 * @typedef {object} VerificationResult
 * @property {VerifyMode} mode
 * @property {boolean} ok
 * @property {VerificationCheck[]} checks
 * @property {string[]} failures
 * @property {string[]} warnings
 */

const MODES = new Set(['local', 'tagged', 'published'])
const REQUIRED_KEYWORDS = [
	'pi-package',
	'pi-extension',
	'pi coding agent',
	'debug mode',
	'evidence-driven debugging',
	'hypothesis-driven debugging',
	'runtime instrumentation',
	'developer tools',
	'cursor debug mode',
]
const EXPECTED_PACKAGE_FILES = [
	'LICENSE',
	'README.md',
	'package.json',
	'src/index.ts',
	'src/protocol.ts',
]
const REQUIRED_SITE_FILES = [
	'docs/.nojekyll',
	'docs/site.css',
	'docs/index.html',
	'docs/zh/index.html',
	'docs/demo.html',
	'docs/demo-zh.html',
	'docs/sitemap.xml',
	'docs/robots.txt',
]
const GALLERY_METADATA_ISSUE = 'https://github.com/earendil-works/pi/issues/6699'

main().catch((error) => {
	console.error(`verify-release: ${error instanceof Error ? error.message : String(error)}`)
	process.exitCode = 2
})

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const root = resolve(options.root)
	const packagePath = resolve(root, 'package.json')
	if (!existsSync(packagePath)) {
		throw new Error(`package.json not found under --root ${root}`)
	}

	const pkg = readJson(packagePath)
	const packageLockPath = resolve(root, 'package-lock.json')
	const packageLock = existsSync(packageLockPath) ? readJson(packageLockPath) : null
	const readmePath = resolve(root, 'README.md')
	const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : ''
	const identity = buildReleaseIdentity(pkg)
	const surfaces = buildPublicSurfaces(identity, pkg, readme)
	const result = createResult(options.mode)
	const context = { root, pkg, packageLock, readme, identity, surfaces }

	runLocalChecks(result, context)
	if (options.mode === 'tagged' || options.mode === 'published') {
		await runTaggedChecks(result, context, options)
	}
	if (options.mode === 'published') {
		await runPublishedChecks(result, context, options)
	}

	if (options.json) {
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
	} else {
		printHumanResult(result)
	}
	if (!result.ok) process.exitCode = 1
}

function parseArgs(argv) {
	const options = {
		root: process.cwd(),
		mode: /** @type {VerifyMode} */ ('local'),
		retries: 2,
		retryDelayMs: 500,
		json: false,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const flag = argv[index]
		if (flag === '--json') {
			options.json = true
			continue
		}
		if (!['--root', '--mode', '--retries', '--retry-delay-ms'].includes(flag)) {
			throw new Error(`unknown flag: ${flag}`)
		}
		const value = argv[index + 1]
		if (!value || value.startsWith('--')) {
			throw new Error(`${flag} requires a value`)
		}
		index += 1
		if (flag === '--root') options.root = value
		if (flag === '--mode') {
			if (!MODES.has(value)) {
				throw new Error(`invalid --mode ${value}; expected local, tagged, or published`)
			}
			options.mode = /** @type {VerifyMode} */ (value)
		}
		if (flag === '--retries') options.retries = parseBoundedInteger(flag, value, 0, 10)
		if (flag === '--retry-delay-ms') {
			options.retryDelayMs = parseBoundedInteger(flag, value, 0, 10_000)
		}
	}
	return options
}

function parseBoundedInteger(flag, value, minimum, maximum) {
	if (!/^\d+$/.test(value)) {
		throw new Error(`${flag} must be an integer from ${minimum} to ${maximum}`)
	}
	const parsed = Number(value)
	if (parsed < minimum || parsed > maximum) {
		throw new Error(`${flag} must be an integer from ${minimum} to ${maximum}`)
	}
	return parsed
}

function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'))
	} catch (error) {
		throw new Error(`cannot parse ${path}: ${error instanceof Error ? error.message : String(error)}`)
	}
}

/** @returns {ReleaseIdentity} */
function buildReleaseIdentity(pkg) {
	const repository = parseGitHubRepository(pkg.repository)
	const version = typeof pkg.version === 'string' ? pkg.version : ''
	return {
		packageName: typeof pkg.name === 'string' ? pkg.name : '',
		version,
		tagName: `v${version}`,
		repository: repository?.url ?? '',
		owner: repository?.owner ?? '',
		repo: repository?.repo ?? '',
		pagesBase: repository ? `https://${repository.owner}.github.io/${repository.repo}/` : '',
	}
}

function parseGitHubRepository(value) {
	const raw = typeof value === 'string' ? value : value?.url
	if (typeof raw !== 'string') return null
	const cleaned = raw.replace(/^git\+/, '').replace(/\.git$/, '')
	try {
		const url = new URL(cleaned)
		const parts = url.pathname.split('/').filter(Boolean)
		if (url.hostname !== 'github.com' || parts.length !== 2) return null
		return {
			owner: parts[0],
			repo: parts[1],
			url: `https://github.com/${parts[0]}/${parts[1]}`,
		}
	} catch {
		return null
	}
}

/** @returns {PublicSurface[]} */
function buildPublicSurfaces(identity, pkg, readme) {
	/** @type {PublicSurface[]} */
	const surfaces = []
	const add = (surface) => {
		if (!surfaces.some((candidate) => candidate.url === surface.url && candidate.owner === surface.owner)) {
			surfaces.push(surface)
		}
	}
	const rawSurface = (id, url, contentKind) => {
		add({
			id,
			owner: 'git-tag',
			url: typeof url === 'string' ? url : '',
			phases: ['local', 'tagged', 'published'],
			localPath: mapRawUrlToLocalPath(identity, url),
			contentKind,
		})
	}

	rawSurface('pi-image', pkg.pi?.image, 'image')
	rawSurface('pi-video', pkg.pi?.video, 'video')
	for (const [index, url] of extractMarkdownMediaLinks(readme).entries()) {
		rawSurface(`readme-media-${index + 1}`, url, mediaContentKind(url))
	}

	const pageRoutes = [
		['pages-home-en', identity.pagesBase, 'docs/index.html'],
		['pages-home-zh', `${identity.pagesBase}zh/`, 'docs/zh/index.html'],
		['pages-demo-en', `${identity.pagesBase}demo.html`, 'docs/demo.html'],
		['pages-demo-zh', `${identity.pagesBase}demo-zh.html`, 'docs/demo-zh.html'],
	]
	for (const [id, url, localPath] of pageRoutes) {
		add({ id, owner: 'pages-main', url, phases: ['local', 'tagged', 'published'], localPath, contentKind: 'html' })
	}
	add({
		id: 'npm-version',
		owner: 'npm-registry',
		url: `https://registry.npmjs.org/${encodeURIComponent(identity.packageName)}/${encodeURIComponent(identity.version)}`,
		phases: ['published'],
		contentKind: 'json',
	})
	add({
		id: 'pi-gallery',
		owner: 'pi-gallery',
		url: `https://pi.dev/packages/${encodeURIComponent(identity.packageName)}`,
		phases: ['published'],
		contentKind: 'html',
	})
	return surfaces
}

function mapRawUrlToLocalPath(identity, value) {
	if (typeof value !== 'string') return undefined
	try {
		const url = new URL(value)
		const parts = url.pathname.split('/').filter(Boolean)
		if (
			url.hostname !== 'raw.githubusercontent.com' ||
			parts.length < 4 ||
			parts[0] !== identity.owner ||
			parts[1] !== identity.repo
		) return undefined
		return parts.slice(3).join('/')
	} catch {
		return undefined
	}
}

function extractMarkdownMediaLinks(markdown) {
	const links = [...markdown.matchAll(/\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g)]
		.map((match) => match[1])
		.filter((url) => /\.(?:png|jpe?g|gif|webp|svg|mp4|webm|mov)(?:[?#].*)?$/i.test(url))
	return [...new Set(links)]
}

function mediaContentKind(url) {
	return /\.(?:mp4|webm|mov)(?:[?#].*)?$/i.test(url) ? 'video' : 'image'
}

/** @returns {VerificationResult} */
function createResult(mode) {
	return { mode, ok: true, checks: [], failures: [], warnings: [] }
}

function addCheck(result, id, status, detail) {
	result.checks.push({ id, status, detail })
	if (status === 'fail') {
		result.ok = false
		result.failures.push(`${id}: ${detail}`)
	}
	if (status === 'warn') result.warnings.push(`${id}: ${detail}`)
}

function runLocalChecks(result, context) {
	checkReleaseIdentity(result, context)
	checkPackageMetadata(result, context)
	checkPiMetadata(result, context)
	checkReleaseCommand(result, context)
	checkReadme(result, context)
	checkRequiredSiteFiles(result, context)
	checkHtmlPages(result, context)
	checkStructuredData(result, context)
	checkSitemap(result, context)
	checkRobots(result, context)
	checkPublicProse(result, context)
	checkSurfaceRegistry(result, context)
	checkNpmPack(result, context)
}

function checkReleaseIdentity(result, { identity, packageLock }) {
	const validIdentity =
		identity.packageName === 'pi-debug-mode' &&
		/^\d+\.\d+\.\d+$/.test(identity.version) &&
		identity.repository === 'https://github.com/liush2yuxjtu/pi-debug-mode' &&
		identity.owner === 'liush2yuxjtu' &&
		identity.repo === 'pi-debug-mode'
	addCheck(
		result,
		'release identity',
		validIdentity ? 'pass' : 'fail',
		`${identity.packageName || '<missing>'}@${identity.version || '<missing>'}; ${identity.tagName}; ${identity.repository || '<invalid repository>'}`,
	)

	const lockVersions = [packageLock?.version, packageLock?.packages?.['']?.version]
	const lockMatches = lockVersions.every((version) => version === identity.version)
	addCheck(
		result,
		'package and lock version',
		lockMatches ? 'pass' : 'fail',
		lockMatches ? `both use ${identity.version}` : `package ${identity.version}; lock ${lockVersions.join(', ')}`,
	)
}

function checkPackageMetadata(result, { pkg, identity }) {
	const description = String(pkg.description ?? '').toLowerCase()
	const descriptionConcepts = ['pi coding agent', 'cursor-style debug mode', 'evidence-first debugging']
	const missingDescription = descriptionConcepts.filter((concept) => !description.includes(concept))
	addCheck(
		result,
		'package description',
		missingDescription.length ? 'fail' : 'pass',
		missingDescription.length ? `missing ${missingDescription.join(', ')}` : String(pkg.description),
	)

	const keywords = Array.isArray(pkg.keywords) ? pkg.keywords.map((keyword) => String(keyword).toLowerCase()) : []
	const missingKeywords = REQUIRED_KEYWORDS.filter((keyword) => !keywords.includes(keyword))
	addCheck(
		result,
		'package keywords',
		missingKeywords.length ? 'fail' : 'pass',
		missingKeywords.length ? `missing ${missingKeywords.join(', ')}` : `covers ${REQUIRED_KEYWORDS.length} required concepts`,
	)

	const expectedRepository = 'git+https://github.com/liush2yuxjtu/pi-debug-mode.git'
	const metadataProblems = []
	if (pkg.homepage !== identity.pagesBase) metadataProblems.push(`homepage must be ${identity.pagesBase}`)
	if (pkg.repository?.url !== expectedRepository) metadataProblems.push(`repository must be ${expectedRepository}`)
	if (pkg.bugs !== `${identity.repository}/issues`) metadataProblems.push(`bugs must be ${identity.repository}/issues`)
	addCheck(
		result,
		'package links',
		metadataProblems.length ? 'fail' : 'pass',
		metadataProblems.length ? metadataProblems.join('; ') : 'homepage, repository, and bugs are canonical',
	)

	const filesMatch = arraysEqual(pkg.files, ['src', 'README.md', 'LICENSE'])
	addCheck(
		result,
		'npm files allowlist',
		filesMatch ? 'pass' : 'fail',
		filesMatch ? 'src, README.md, LICENSE' : `expected ["src","README.md","LICENSE"], got ${JSON.stringify(pkg.files)}`,
	)
}

function checkPiMetadata(result, { pkg, identity }) {
	const pi = pkg.pi
	const supportedKeys = ['extensions', 'image', 'video']
	const unknownKeys = pi && typeof pi === 'object'
		? Object.keys(pi).filter((key) => !supportedKeys.includes(key))
		: []
	const expectedImage = `https://raw.githubusercontent.com/${identity.owner}/${identity.repo}/${identity.tagName}/artifacts/demo/pi-debug-mode-real-tui-poster.png`
	const expectedVideo = `https://raw.githubusercontent.com/${identity.owner}/${identity.repo}/${identity.tagName}/artifacts/demo/pi-debug-mode-real-tui.mp4`
	const problems = []
	if (!pi || typeof pi !== 'object') problems.push('pi metadata is missing')
	if (!arraysEqual(pi?.extensions, ['./src/index.ts'])) problems.push('pi.extensions must contain only ./src/index.ts')
	if (pi?.image !== expectedImage) problems.push(`pi.image must be ${expectedImage}`)
	if (pi?.video !== expectedVideo) problems.push(`pi.video must be ${expectedVideo}`)
	if (unknownKeys.length) problems.push(`unsupported fields ${unknownKeys.join(', ')}`)
	addCheck(
		result,
		'Pi metadata',
		problems.length ? 'fail' : 'pass',
		problems.length ? problems.join('; ') : `supported fields with ${identity.tagName} media pins`,
	)
}

function checkReleaseCommand(result, { root, pkg }) {
	const workflowPath = resolve(root, '.github/workflows/release.yml')
	const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf8') : ''
	const versionGateIndex = workflow.indexOf('- name: Verify release version')
	const installIndex = workflow.indexOf('- run: npm ci')
	const typecheckIndex = workflow.indexOf('- run: npm run typecheck')
	const verifierIndex = workflow.indexOf('- run: npm run verify:release -- --mode local')
	const ownsNpmPublish =
		workflow.includes('release:') &&
		workflow.includes('types: [published]') &&
		workflow.includes('id-token: write') &&
		workflow.includes('npm publish --access public')
	const pagesCoupled = /actions\/deploy-pages|pages:\s*write|github-pages|index submission/i.test(workflow)
	const valid =
		pkg.scripts?.['verify:release'] === 'node scripts/verify-release.mjs' &&
		versionGateIndex >= 0 && installIndex > versionGateIndex &&
		typecheckIndex > installIndex && verifierIndex > typecheckIndex &&
		ownsNpmPublish && !pagesCoupled
	addCheck(
		result,
		'release workflow',
		valid ? 'pass' : 'fail',
		valid
			? 'version gate runs before install; local verifier runs after typecheck; GitHub Release OIDC remains npm publication owner'
			: 'expected version gate before install and local verifier after typecheck, with no Pages deployment',
	)
}

function checkReadme(result, { root, readme, identity }) {
	const prose = markdownToText(readme)
	const firstWords = prose.split(/\s+/).filter(Boolean).slice(0, 60).join(' ').toLowerCase()
	const openingConcepts = ['cursor-style', 'evidence-first debug mode', 'pi coding agent', 'runtime evidence before changing code']
	const openingMissing = openingConcepts.filter((concept) => !firstWords.includes(concept))
	const contractMarkers = [
		'## Why not a normal debug prompt?',
		'## FAQ',
		identity.pagesBase,
		`${identity.pagesBase}zh/`,
		`${identity.pagesBase}demo.html`,
		`${identity.pagesBase}demo-zh.html`,
	]
	const missingMarkers = contractMarkers.filter((marker) => !readme.includes(marker))
	addCheck(
		result,
		'README information contract',
		openingMissing.length || missingMarkers.length ? 'fail' : 'pass',
		openingMissing.length || missingMarkers.length
			? `opening missing ${openingMissing.join(', ') || 'none'}; content missing ${missingMarkers.join(', ') || 'none'}`
			: 'definition, comparison, FAQ, sites, and demo routes are present',
	)

	const mediaLinks = extractMarkdownMediaLinks(readme)
	const mediaProblems = []
	if (!mediaLinks.length) mediaProblems.push('no media links found')
	for (const url of mediaLinks) {
		const localPath = mapRawUrlToLocalPath(identity, url)
		if (!url.startsWith(`https://raw.githubusercontent.com/${identity.owner}/${identity.repo}/${identity.tagName}/`)) {
			mediaProblems.push(`not an absolute ${identity.tagName} Raw URL: ${url}`)
			continue
		}
		if (!localPath || !safeLocalFileExists(root, localPath)) {
			mediaProblems.push(`no local source for ${url}`)
		}
	}
	addCheck(
		result,
		'README media',
		mediaProblems.length ? 'fail' : 'pass',
		mediaProblems.length ? mediaProblems.join('; ') : `${mediaLinks.length} absolute ${identity.tagName} media links map to local files`,
	)
}

function checkRequiredSiteFiles(result, { root }) {
	const missing = REQUIRED_SITE_FILES.filter((path) => !existsSync(resolve(root, path)))
	addCheck(
		result,
		'site files',
		missing.length ? 'fail' : 'pass',
		missing.length ? `missing ${missing.join(', ')}` : `${REQUIRED_SITE_FILES.length} required files present`,
	)
}

function pageSpecs(identity) {
	return [
		{
			path: 'docs/index.html', lang: 'en', canonical: identity.pagesBase,
			alternates: { en: identity.pagesBase, 'zh-CN': `${identity.pagesBase}zh/`, 'x-default': identity.pagesBase },
			stylesheet: 'site.css', home: true,
		},
		{
			path: 'docs/zh/index.html', lang: 'zh-CN', canonical: `${identity.pagesBase}zh/`,
			alternates: { en: identity.pagesBase, 'zh-CN': `${identity.pagesBase}zh/`, 'x-default': identity.pagesBase },
			stylesheet: '../site.css', home: true,
		},
		{
			path: 'docs/demo.html', lang: 'en', canonical: `${identity.pagesBase}demo.html`,
			alternates: { en: `${identity.pagesBase}demo.html`, 'zh-CN': `${identity.pagesBase}demo-zh.html`, 'x-default': `${identity.pagesBase}demo.html` },
			home: false,
		},
		{
			path: 'docs/demo-zh.html', lang: 'zh-CN', canonical: `${identity.pagesBase}demo-zh.html`,
			alternates: { en: `${identity.pagesBase}demo.html`, 'zh-CN': `${identity.pagesBase}demo-zh.html`, 'x-default': `${identity.pagesBase}demo.html` },
			home: false,
		},
	]
}

function checkHtmlPages(result, { root, identity, pkg }) {
	const sharedCssPath = resolve(root, 'docs/site.css')
	const sharedCss = existsSync(sharedCssPath) ? readFileSync(sharedCssPath, 'utf8') : ''
	const titles = []
	for (const spec of pageSpecs(identity)) {
		const path = resolve(root, spec.path)
		if (!existsSync(path)) {
			addCheck(result, `HTML ${spec.path}`, 'fail', 'file is missing')
			continue
		}
		const html = readFileSync(path, 'utf8')
		const problems = []
		const htmlAttrs = openingTags(html, 'html')[0] ?? {}
		if (htmlAttrs.lang !== spec.lang) problems.push(`html lang must be ${spec.lang}`)
		const viewport = metaValue(html, 'name', 'viewport')
		if (!viewport?.includes('width=device-width') || !viewport.includes('initial-scale=1')) problems.push('viewport is missing or incomplete')
		const canonicalLinks = linkTags(html, 'canonical')
		if (canonicalLinks.length !== 1 || canonicalLinks[0].href !== spec.canonical) problems.push(`canonical must be ${spec.canonical}`)
		const alternateLinks = linkTags(html, 'alternate')
		for (const [lang, url] of Object.entries(spec.alternates)) {
			if (!alternateLinks.some((link) => link.hreflang === lang && link.href === url)) problems.push(`missing ${lang} alternate ${url}`)
		}
		if (openingTags(html, 'h1').length !== 1) problems.push('page must have one H1')
		for (const landmark of ['header', 'nav', 'main', 'footer']) {
			if (openingTags(html, landmark).length !== 1) problems.push(`page must have one ${landmark}`)
		}
		if (!/<a\b[^>]*class=["'][^"']*skip-link/i.test(html)) problems.push('skip link is missing')
		if (metaValue(html, 'name', 'keywords') !== null) problems.push('obsolete meta keywords must be removed')
		const description = metaValue(html, 'name', 'description')
		if (!description || description.length < 80) problems.push('meta description is missing or too short')
		const title = extractTitle(html)
		if (!title) problems.push('title is missing')
		else titles.push({ path: spec.path, lang: spec.lang, title })
		const expectedSocial = [
			['property', 'og:title'], ['property', 'og:description'], ['property', 'og:url'], ['property', 'og:image'],
			['name', 'twitter:title'], ['name', 'twitter:description'], ['name', 'twitter:url'], ['name', 'twitter:image'],
		]
		for (const [attribute, name] of expectedSocial) {
			if (!metaValue(html, attribute, name)) problems.push(`${name} is missing`)
		}
		if (metaValue(html, 'property', 'og:url') !== spec.canonical) problems.push('og:url must match canonical')
		if (metaValue(html, 'name', 'twitter:url') !== spec.canonical) problems.push('twitter:url must match canonical')
		const expectedImagePrefix = `https://raw.githubusercontent.com/${identity.owner}/${identity.repo}/${identity.tagName}/`
		if (!String(metaValue(html, 'property', 'og:image') ?? '').startsWith(expectedImagePrefix)) problems.push(`og:image must use ${identity.tagName} Raw media`)
		if (!String(metaValue(html, 'name', 'twitter:image') ?? '').startsWith(expectedImagePrefix)) problems.push(`twitter:image must use ${identity.tagName} Raw media`)
		if (metaValue(html, 'property', 'og:image:width') !== '1280') problems.push('og:image:width must be 1280')
		if (metaValue(html, 'property', 'og:image:height') !== '720') problems.push('og:image:height must be 720')
		if (metaValue(html, 'name', 'release-version') !== pkg.version) problems.push(`release-version must be ${pkg.version}`)
		const stylesheets = openingTags(html, 'link').filter((link) => link.rel === 'stylesheet')
		if (spec.stylesheet && !stylesheets.some((link) => link.href === spec.stylesheet)) problems.push(`stylesheet must be ${spec.stylesheet}`)
		const styleText = spec.stylesheet ? `${sharedCss}\n${html}` : html
		if (!styleText.includes(':focus-visible')) problems.push('focus-visible style is missing')
		if (!/min-height:\s*44px/.test(styleText)) problems.push('44px interactive target rule is missing')
		if (!styleText.includes('prefers-reduced-motion')) problems.push('reduced-motion rule is missing')
		for (const image of openingTags(html, 'img')) {
			if (!image.alt) problems.push('every image needs descriptive alt text')
			if (!image.width || !image.height) problems.push('every image needs intrinsic width and height')
			if (image.loading !== 'lazy') problems.push('below-fold images must use loading=lazy')
			if (image.decoding !== 'async') problems.push('below-fold images must use decoding=async')
		}
		for (const header of openingTags(html, 'th')) {
			if (header.scope !== 'col') problems.push('table column headers need scope=col')
		}
		if (spec.home) {
			for (const id of ['install', 'when-to-use', 'workflow', 'evidence', 'compare', 'security', 'faq']) {
				if (!new RegExp(`<section\\b[^>]*\\bid=["']${id}["']`, 'i').test(html)) problems.push(`section #${id} is missing`)
			}
		} else {
			const homepage = spec.lang === 'en' ? identity.pagesBase : `${identity.pagesBase}zh/`
			if (!html.includes(`href="${homepage}"`)) problems.push(`homepage navigation must link to ${homepage}`)
		}
		addCheck(
			result,
			`HTML ${spec.path}`,
			problems.length ? 'fail' : 'pass',
			problems.length ? problems.join('; ') : `${spec.lang}; canonical, hreflang, social metadata, landmarks, and access rules pass`,
		)
	}

	const titleProblems = []
	if (new Set(titles.map(({ title }) => title)).size !== titles.length) titleProblems.push('titles must be unique')
	for (const { path, lang, title } of titles) {
		if (lang === 'en' && (title.length < 50 || title.length > 60)) titleProblems.push(`${path} title has ${title.length} characters`)
		if (lang === 'zh-CN' && (title.length < 20 || title.length > 60)) titleProblems.push(`${path} title has ${title.length} characters`)
	}
	addCheck(
		result,
		'HTML titles',
		titleProblems.length ? 'fail' : 'pass',
		titleProblems.length ? titleProblems.join('; ') : `${titles.length} unique titles use practical lengths`,
	)
}

function checkStructuredData(result, { root, identity, pkg }) {
	for (const spec of pageSpecs(identity).filter((page) => page.home)) {
		const path = resolve(root, spec.path)
		if (!existsSync(path)) {
			addCheck(result, `JSON-LD ${spec.path}`, 'fail', 'file is missing')
			continue
		}
		const html = readFileSync(path, 'utf8')
		const parsed = parseJsonLd(html)
		const problems = [...parsed.errors]
		const software = findJsonLdObjects(parsed.values, 'SoftwareApplication')[0]
		const faq = findJsonLdObjects(parsed.values, 'FAQPage')[0]
		if (!software) problems.push('SoftwareApplication is missing')
		if (software && software.softwareVersion !== pkg.version) problems.push(`SoftwareApplication softwareVersion must be ${pkg.version}`)
		if (software && software.url !== spec.canonical) problems.push('SoftwareApplication url must match canonical')
		if (!faq) problems.push('FAQPage is missing')
		const entities = Array.isArray(faq?.mainEntity) ? faq.mainEntity : []
		if (entities.length !== 3) problems.push('FAQPage must contain three questions')
		const visible = comparableText(htmlToText(html))
		for (const entity of entities) {
			const question = normalizeWhitespace(String(entity?.name ?? ''))
			const answer = normalizeWhitespace(String(entity?.acceptedAnswer?.text ?? ''))
			if (!question || !visible.includes(comparableText(question))) problems.push(`FAQ question is not visible: ${question || '<missing>'}`)
			if (!answer || !visible.includes(comparableText(answer))) problems.push(`FAQ answer is not visible: ${answer || '<missing>'}`)
		}
		addCheck(
			result,
			`JSON-LD ${spec.path}`,
			problems.length ? 'fail' : 'pass',
			problems.length ? problems.join('; ') : 'SoftwareApplication and visible three-question FAQPage parse',
		)
	}
}

function checkSitemap(result, { root, identity }) {
	const path = resolve(root, 'docs/sitemap.xml')
	if (!existsSync(path)) {
		addCheck(result, 'sitemap', 'fail', 'docs/sitemap.xml is missing')
		return
	}
	const xml = readFileSync(path, 'utf8')
	const expected = [identity.pagesBase, `${identity.pagesBase}zh/`, `${identity.pagesBase}demo.html`, `${identity.pagesBase}demo-zh.html`]
	const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
	const problems = []
	if (!arraysEqual(locs, expected)) problems.push(`loc entries must be exactly ${expected.join(', ')}`)
	if (/<(?:changefreq|priority)>/i.test(xml)) problems.push('changefreq and priority must be absent')
	if (!xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) problems.push('xhtml namespace is missing')
	for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
		const loc = block[1].match(/<loc>([^<]+)<\/loc>/)?.[1]
		const expectedAlternates = loc?.endsWith('demo.html') || loc?.endsWith('demo-zh.html')
			? { en: `${identity.pagesBase}demo.html`, 'zh-CN': `${identity.pagesBase}demo-zh.html`, 'x-default': `${identity.pagesBase}demo.html` }
			: { en: identity.pagesBase, 'zh-CN': `${identity.pagesBase}zh/`, 'x-default': identity.pagesBase }
		const links = openingTags(block[1], 'xhtml:link')
		for (const [lang, url] of Object.entries(expectedAlternates)) {
			if (!links.some((link) => link.rel === 'alternate' && link.hreflang === lang && link.href === url)) problems.push(`${loc || '<missing loc>'} lacks ${lang} alternate`)
		}
	}
	addCheck(result, 'sitemap', problems.length ? 'fail' : 'pass', problems.length ? problems.join('; ') : 'four canonical routes and language alternates only')
}

function checkRobots(result, { root, identity }) {
	const path = resolve(root, 'docs/robots.txt')
	if (!existsSync(path)) {
		addCheck(result, 'robots.txt', 'fail', 'docs/robots.txt is missing')
		return
	}
	const lines = readFileSync(path, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
	const expected = ['User-agent: *', 'Allow: /', `Sitemap: ${identity.pagesBase}sitemap.xml`]
	addCheck(
		result,
		'robots.txt',
		arraysEqual(lines, expected) ? 'pass' : 'fail',
		arraysEqual(lines, expected) ? 'crawl allowed and sitemap named' : `expected only ${expected.join(' | ')}`,
	)
}

function checkPublicProse(result, { root }) {
	const files = [
		'README.md', 'package.json', 'docs/index.html', 'docs/zh/index.html',
		'docs/demo.html', 'docs/demo-zh.html', 'docs/sitemap.xml', 'docs/robots.txt',
	]
	const patterns = [
		['local user path', /\/Users\//],
		['file URL', /file:\/\//i],
		['localhost', /localhost/i],
		['stale 0.1.0', /\b0\.1\.0\b/],
		['stale Chinese demo route', /\/zh\/demo\.html/],
	]
	const problems = []
	for (const file of files) {
		const path = resolve(root, file)
		if (!existsSync(path)) continue
		const text = readFileSync(path, 'utf8')
		for (const [label, pattern] of patterns) {
			if (pattern.test(text)) problems.push(`${file} contains ${label}`)
		}
		if (
			(file === 'docs/demo.html' || file === 'docs/demo-zh.html') &&
			/\blocal\s+(?:demo|recording)\b|本地(?:产品)?(?:演示|录制)/i.test(text)
		) problems.push(`${file} contains local-demo wording`)
	}
	addCheck(result, 'public prose', problems.length ? 'fail' : 'pass', problems.length ? problems.join('; ') : 'no machine paths, stale routes, stale versions, or local-demo wording')
}

function checkSurfaceRegistry(result, { root, identity, surfaces }) {
	const problems = []
	const ids = new Set()
	for (const surface of surfaces) {
		if (ids.has(surface.id)) problems.push(`duplicate id ${surface.id}`)
		ids.add(surface.id)
		if (!['git-tag', 'pages-main', 'npm-registry', 'pi-gallery'].includes(surface.owner)) problems.push(`${surface.id} has invalid owner`)
		if (!surface.url) problems.push(`${surface.id} has empty URL`)
		if (surface.owner === 'git-tag') {
			if (!surface.url.startsWith(`https://raw.githubusercontent.com/${identity.owner}/${identity.repo}/${identity.tagName}/`)) problems.push(`${surface.id} is not pinned to ${identity.tagName}`)
			if (!surface.localPath || !safeLocalFileExists(root, surface.localPath)) {
				problems.push(`${surface.id} has no local source mapping`)
			} else if (surface.contentKind === 'image') {
				const dimensions = readPngDimensions(resolve(root, surface.localPath))
				if (!dimensions || dimensions.width !== 1280 || dimensions.height !== 720) problems.push(`${surface.id} source must be a 1280x720 PNG`)
			}
		}
		if (surface.owner === 'pages-main' && (!surface.localPath || !safeLocalFileExists(root, surface.localPath))) problems.push(`${surface.id} has no page source`)
	}
	addCheck(
		result,
		'public surface registry',
		problems.length ? 'fail' : 'pass',
		problems.length ? problems.join('; ') : `${surfaces.length} surfaces have one owner, phase list, content kind, and local mapping where required`,
	)
}

function safeLocalFileExists(root, localPath) {
	const absolute = resolve(root, localPath)
	return absolute.startsWith(`${root}${sep}`) && existsSync(absolute)
}

function readPngDimensions(path) {
	try {
		const header = readFileSync(path).subarray(0, 24)
		const signature = '89504e470d0a1a0a'
		if (header.length < 24 || header.subarray(0, 8).toString('hex') !== signature) return null
		return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) }
	} catch {
		return null
	}
}

function checkNpmPack(result, { root }) {
	const run = spawnSync('npm', ['pack', '--json', '--dry-run'], {
		cwd: root,
		encoding: 'utf8',
		timeout: 120_000,
		maxBuffer: 10 * 1024 * 1024,
		env: { ...process.env, NPM_CONFIG_UPDATE_NOTIFIER: 'false' },
	})
	if (run.error || run.status !== 0) {
		const detail = run.error?.message || run.stderr.trim() || `exit ${run.status}`
		addCheck(result, 'npm pack file list', 'fail', detail)
		return
	}
	try {
		const payload = JSON.parse(run.stdout)
		const files = payload?.[0]?.files?.map((file) => file.path).sort() ?? []
		addCheck(
			result,
			'npm pack file list',
			arraysEqual(files, EXPECTED_PACKAGE_FILES) ? 'pass' : 'fail',
			arraysEqual(files, EXPECTED_PACKAGE_FILES) ? files.join(', ') : `expected ${EXPECTED_PACKAGE_FILES.join(', ')}; got ${files.join(', ')}`,
		)
	} catch {
		addCheck(result, 'npm pack file list', 'fail', 'npm pack returned invalid JSON')
	}
}

async function runTaggedChecks(result, { identity, surfaces }, options) {
	const targets = surfaces.filter((surface) => surface.phases.includes('tagged'))
	const responses = await Promise.all(targets.map((surface) => fetchWithRetry(surface, options)))
	for (let index = 0; index < targets.length; index += 1) {
		const surface = targets[index]
		const response = responses[index]
		const markerMissing = surface.owner === 'pages-main' && response.ok && !hasReleaseMarker(response.body, identity.version)
		addCheck(
			result,
			`tagged ${surface.id}`,
			response.ok && !markerMissing ? 'pass' : 'fail',
			markerMissing ? `HTTP ${response.status}; page lacks release marker ${identity.version}` : response.detail,
		)
	}
}

async function runPublishedChecks(result, { identity, surfaces }, options) {
	const npmSurface = surfaces.find((surface) => surface.owner === 'npm-registry')
	const gallerySurface = surfaces.find((surface) => surface.owner === 'pi-gallery')
	if (!npmSurface || !gallerySurface) {
		addCheck(result, 'published surfaces', 'fail', 'npm registry or Pi Gallery surface is missing')
		return
	}
	const [npmResponse, galleryResponse] = await Promise.all([
		fetchWithRetry(npmSurface, options),
		fetchWithRetry(gallerySurface, options),
	])

	let npmValid = false
	if (npmResponse.ok) {
		try {
			const payload = JSON.parse(npmResponse.body)
			npmValid = payload.name === identity.packageName && payload.version === identity.version
		} catch {
			npmValid = false
		}
	}
	addCheck(
		result,
		'published npm version',
		npmResponse.ok && npmValid ? 'pass' : 'fail',
		npmResponse.ok && npmValid ? `${identity.packageName}@${identity.version} exists in registry.npmjs.org` : `${npmResponse.detail}; exact package or version did not match`,
	)

	const versionPattern = new RegExp(`(^|[^0-9.])${escapeRegExp(identity.version)}([^0-9.]|$)`)
	const galleryReferencesRelease =
		galleryResponse.ok &&
		galleryResponse.body.includes(identity.packageName) &&
		versionPattern.test(galleryResponse.body)
	addCheck(
		result,
		'published Pi Gallery page',
		galleryReferencesRelease ? 'pass' : 'fail',
		galleryReferencesRelease ? `HTTP 200 references ${identity.packageName}@${identity.version}` : `${galleryResponse.detail}; package or version reference missing`,
	)
	if (galleryResponse.ok) {
		const description = metaValue(galleryResponse.body, 'name', 'description') ?? ''
		const ogDescription = metaValue(galleryResponse.body, 'property', 'og:description') ?? ''
		const generic = !description.includes(identity.packageName) || !ogDescription.includes(identity.packageName)
		addCheck(
			result,
			'Pi Gallery social metadata',
			generic ? 'warn' : 'pass',
			generic ? `generic description or OG metadata remains; tracked at ${GALLERY_METADATA_ISSUE}` : 'description and OG metadata name the package',
		)
	}
}

async function fetchWithRetry(surface, options) {
	let last = { ok: false, status: 0, body: '', detail: 'request did not run' }
	for (let attempt = 0; attempt <= options.retries; attempt += 1) {
		last = await fetchSurface(surface)
		if (last.ok) return last
		if (attempt < options.retries) await wait(options.retryDelayMs)
	}
	return { ...last, detail: `${last.detail} after ${options.retries + 1} attempt${options.retries === 0 ? '' : 's'}` }
}

async function fetchSurface(surface) {
	let url
	try {
		url = new URL(surface.url)
		if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
	} catch {
		return { ok: false, status: 0, body: '', detail: `invalid URL ${surface.url}` }
	}
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 10_000)
	try {
		const binary = surface.contentKind === 'image' || surface.contentKind === 'video'
		const response = await fetch(url, {
			signal: controller.signal,
			headers: binary ? { Range: 'bytes=0-1023' } : undefined,
		})
		const statusOk = response.status === 200 || (binary && response.status === 206)
		const contentType = response.headers.get('content-type') ?? ''
		if (!statusOk) return { ok: false, status: response.status, body: '', detail: `HTTP ${response.status} ${surface.url}` }
		if (binary) {
			const expected = surface.contentKind === 'image' ? 'image/' : 'video/'
			const typeOk = contentType.startsWith(expected) || contentType.startsWith('application/octet-stream')
			const reader = response.body?.getReader()
			const first = reader ? await reader.read() : { value: undefined }
			await reader?.cancel()
			const byteCount = first.value?.byteLength ?? 0
			return {
				ok: typeOk && byteCount > 0,
				status: response.status,
				body: '',
				detail: typeOk && byteCount > 0
					? `HTTP ${response.status}; ${contentType}; non-empty binary response`
					: `HTTP ${response.status}; expected ${expected} content and non-empty bytes, got ${contentType || '<no content-type>'}`,
			}
		}
		const body = await response.text()
		const expectedType = surface.contentKind === 'json' ? 'application/json' : 'text/html'
		const typeOk = contentType.includes(expectedType)
		return {
			ok: typeOk && body.trim().length > 0,
			status: response.status,
			body,
			detail: typeOk && body.trim().length > 0
				? `HTTP ${response.status}; ${contentType}; non-empty response`
				: `HTTP ${response.status}; expected ${expectedType} and non-empty response, got ${contentType || '<no content-type>'}`,
		}
	} catch (error) {
		const detail = error instanceof Error && error.name === 'AbortError'
			? `request timed out for ${surface.url}`
			: `request failed for ${surface.url}: ${error instanceof Error ? error.message : String(error)}`
		return { ok: false, status: 0, body: '', detail }
	} finally {
		clearTimeout(timeout)
	}
}

function hasReleaseMarker(html, version) {
	return html.includes(`content="${version}"`) || html.includes(`data-release-version="${version}"`)
}

function openingTags(html, tagName) {
	const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)>`, 'gi')
	return [...html.matchAll(pattern)].map((match) => parseAttributes(match[1]))
}

function parseAttributes(source) {
	const attributes = {}
	for (const match of source.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
		attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? ''
	}
	return attributes
}

function linkTags(html, rel) {
	return openingTags(html, 'link').filter((attributes) => String(attributes.rel ?? '').split(/\s+/).includes(rel))
}

function metaValue(html, attribute, expected) {
	const tag = openingTags(html, 'meta').find((attributes) => attributes[attribute]?.toLowerCase() === expected.toLowerCase())
	return tag?.content ?? null
}

function extractTitle(html) {
	return normalizeWhitespace(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
}

function parseJsonLd(html) {
	const values = []
	const errors = []
	for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
		try {
			values.push(JSON.parse(match[1]))
		} catch (error) {
			errors.push(`invalid JSON-LD: ${error instanceof Error ? error.message : String(error)}`)
		}
	}
	return { values, errors }
}

function findJsonLdObjects(values, type) {
	const found = []
	const visit = (value) => {
		if (!value || typeof value !== 'object') return
		if (value['@type'] === type) found.push(value)
		for (const child of Object.values(value)) {
			if (Array.isArray(child)) child.forEach(visit)
			else if (child && typeof child === 'object') visit(child)
		}
	}
	values.forEach(visit)
	return found
}

function markdownToText(markdown) {
	return markdown
		.replace(/^#{1,6}\s*/gm, '')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[`*_>#|]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function htmlToText(html) {
	return decodeHtmlEntities(
		html
			.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
			.replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
			.replace(/<[^>]+>/g, ' '),
	)
}

function decodeHtmlEntities(value) {
	const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
	return value
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
		.replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => named[name])
}

function normalizeWhitespace(value) {
	return value.replace(/\s+/g, ' ').trim()
}

function comparableText(value) {
	return normalizeWhitespace(value).replace(/\s/g, '')
}

function arraysEqual(left, right) {
	return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index])
}

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wait(milliseconds) {
	return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}

function printHumanResult(result) {
	for (const check of result.checks) {
		process.stdout.write(`[${check.status.toUpperCase()}] ${check.id}: ${check.detail}\n`)
	}
	const passed = result.checks.filter((check) => check.status === 'pass').length
	process.stdout.write(`${result.ok ? 'PASS' : 'FAIL'} ${result.mode}: ${passed} passed, ${result.failures.length} failed, ${result.warnings.length} warnings\n`)
}
