import React, {useId, useState} from 'react';
import {paginate, pageNumbers} from './pagination.js';

export function usePagination(items, filterKey = '') {
  const [position, setPosition] = useState({page: 1, filterKey});
  const [pageSize, setPageSize] = useState(25);
  const result = paginate(items, position.filterKey === filterKey ? position.page : 1, pageSize);
  // Keep the stored page valid when a deletion or refresh reduces the page count.
  if (position.filterKey !== filterKey || position.page !== result.page) {
    setPosition({page: result.page, filterKey});
  }
  return {...result, setPage: page => setPosition({page, filterKey}), setPageSize: size => {
    setPageSize(size);
    setPosition({page: 1, filterKey});
  }};
}

export default function Pagination({pagination, label}) {
  const id = useId();
  const {page, pageCount, pageSize, start, end, total, setPage, setPageSize} = pagination;
  const pages = pageNumbers(page, pageCount);
  return <nav className="list-pagination" aria-label={`${label} pagination`}>
    <p className="small muted" role="status">Showing {start}–{end} of {total}</p>
    <label htmlFor={id}>Rows per page
      <select id={id} value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
        {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
    <div className="pagination-buttons">
      <button type="button" className="button secondary small-button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      {pages.map((number, index) => <React.Fragment key={number}>
        {index > 0 && number - pages[index - 1] > 1 && <span aria-hidden="true">…</span>}
        <button type="button" className={`button ${number === page ? 'dark' : 'secondary'} small-button`} aria-label={`Page ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>
      </React.Fragment>)}
      <button type="button" className="button secondary small-button" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </nav>;
}
