import { App } from 'obsidian';
import { parseCrossVaultRefs } from '../note-anatomy/markdown-parser';

export interface CrossVaultDep {
	sourcePath:     string; // vault-relative file path
	sourceBasename: string; // file name without extension
	targetVault:    string; // decoded vault param from obsidian:// URI
	targetFile:     string; // decoded file param from obsidian:// URI
	raw:            string; // full obsidian:// URI as found in the note
}

export async function scanVault(app: App): Promise<CrossVaultDep[]> {
	const files = app.vault.getMarkdownFiles();
	const deps: CrossVaultDep[] = [];

	for (const file of files) {
		const content = await app.vault.read(file);
		const refs = parseCrossVaultRefs(content);
		for (const ref of refs) {
			deps.push({
				sourcePath:     file.path,
				sourceBasename: file.basename,
				targetVault:    ref.vault,
				targetFile:     ref.file,
				raw:            ref.raw,
			});
		}
	}

	return deps;
}
