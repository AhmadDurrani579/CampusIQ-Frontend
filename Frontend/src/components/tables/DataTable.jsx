import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button, EmptyState, Input } from '../ui';

export default function DataTable({ columns, rows = [], searchKeys, pageSize = 6, emptyTitle = 'No results found', emptyDescription = 'Try another search or change your filters.', searchPlaceholder = 'Search records...', toolbar, searchable = true }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: null, direction: 1 });
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const keys = searchKeys || columns.map((c) => c.key);
    const result = rows.filter((row) => keys.some((key) => String(row[key] ?? '').toLowerCase().includes(search.toLowerCase())));
    if (sort.key) result.sort((a, b) => String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), undefined, { numeric: true }) * sort.direction);
    return result;
  }, [rows, search, searchKeys, columns, sort]);
  const count = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, count);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  return <div className="data-table">{(searchable || toolbar) && <div className="table-toolbar">{searchable && <div className="search-input"><Search size={16} /><Input aria-label="Search records" placeholder={searchPlaceholder} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>}{toolbar}</div>}<div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.sortable === false ? column.label : <button onClick={() => setSort({ key: column.key, direction: sort.key === column.key ? -sort.direction : 1 })}>{column.label}<ArrowUpDown size={12} /></button>}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row.id ?? row.reference ?? index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>)}</tbody></table></div>{!visible.length && <EmptyState title={emptyTitle} description={emptyDescription} />}<div className="table-pagination"><span>{filtered.length ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, filtered.length)}` : '0'} of {filtered.length} records</span><div><Button variant="ghost" size="icon" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></Button><span>Page {current} of {count}</span><Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= count} onClick={() => setPage(current + 1)}><ChevronRight size={16} /></Button></div></div></div>;
}
