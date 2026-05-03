// Browser-side runtime for the SuiteQL Query page.
// Tracks the current page index, POSTs the query + page index to the server,
// renders the returned rows into a table, and handles Prev/Next navigation.

const pageSize = 1000;
let currentPageIndex = 0;
let lastResponse = null;

function runQuery() {
	currentPageIndex = 0;
	fetchPage();
}

function prevPage() {
	if (currentPageIndex > 0) {
		currentPageIndex--;
		fetchPage();
	}
}

function nextPage() {
	if (lastResponse && currentPageIndex < lastResponse.pageCount - 1) {
		currentPageIndex++;
		fetchPage();
	}
}

function fetchPage() {
	const sql = document.getElementById('sql').value;
	setStatus('Running...');
	document.getElementById('pagination').style.display = 'none';

	const xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (this.readyState !== 4) return;
		if (this.status !== 200) {
			setStatus('HTTP ' + this.status + ': ' + this.responseText);
			return;
		}
		let resp;
		try {
			resp = JSON.parse(this.responseText);
		}
		catch (e) {
			setStatus('Bad response: ' + this.responseText);
			return;
		}
		if (resp.error) {
			setStatus('Error: ' + resp.error);
			return;
		}
		lastResponse = resp;
		renderResults(resp);
	};
	xhr.open('POST', window.commandPostUrl);
	xhr.setRequestHeader('Content-type', 'application/json');
	xhr.send(JSON.stringify({ query: sql, pageIndex: currentPageIndex, pageSize }));
}

function setStatus(text) {
	document.getElementById('status').textContent = text;
}

function renderResults(resp) {
	setStatus('Page ' + (resp.pageIndex + 1) + ' of ' + Math.max(resp.pageCount, 1) + ' · ' + resp.totalCount + ' rows total');
	document.getElementById('pageLabel').textContent = 'Page ' + (resp.pageIndex + 1) + ' / ' + resp.pageCount;
	document.getElementById('prevBtn').disabled = resp.pageIndex === 0;
	document.getElementById('nextBtn').disabled = resp.pageIndex >= resp.pageCount - 1;
	document.getElementById('pagination').style.display = resp.pageCount > 1 ? 'block' : 'none';

	const headRow = '<tr>' +
		resp.columns.map(c =>
			'<th class="mdl-data-table__cell--non-numeric">' + escapeHtml(c) + '</th>'
		).join('') +
		'</tr>';
	const bodyRows = resp.rows.map(r =>
		'<tr>' +
			r.map(v =>
				'<td class="mdl-data-table__cell--non-numeric" style="font-family: monospace">' +
					escapeHtml(v == null ? '' : String(v)) +
				'</td>'
			).join('') +
		'</tr>'
	).join('');

	document.getElementById('results').innerHTML =
		'<div style="overflow-x: auto; max-height: 40em; overflow-y: auto">' +
			'<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" style="white-space: nowrap">' +
				'<thead>' + headRow + '</thead>' +
				'<tbody>' + bodyRows + '</tbody>' +
			'</table>' +
		'</div>';
}

function escapeHtml(s) {
	return s.replace(/[&<>"']/g, c => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	})[c]);
}
