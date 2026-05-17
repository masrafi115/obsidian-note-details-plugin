import { CrossVaultDep } from './vault-scanner';

function escapeCsv(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return '"' + value.replace(/"/g, '""') + '"';
	}
	return value;
}

function buildCsvString(deps: CrossVaultDep[]): string {
	const header = 'Source File,Target Vault,Target File';
	const rows = deps.map(d =>
		[escapeCsv(d.sourcePath), escapeCsv(d.targetVault), escapeCsv(d.targetFile)].join(','),
	);
	return [header, ...rows].join('\n');
}

export function downloadCsv(deps: CrossVaultDep[]): void {
	const csv = buildCsvString(deps);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'cross-vault-deps.csv';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
