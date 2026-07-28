import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEARCH_MAX, SEARCH_MIN } from '../constants/searchLimits';

interface SearchBoxProps {
    /** 검색 결과 화면에서 재검색할 때 현재 검색어를 채워 넣는다. */
    initialQuery?: string;
}

const SearchBox = ({ initialQuery = '' }: SearchBoxProps) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState(initialQuery);
    const [error, setError] = useState('');

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        // 백엔드 SearchQuery와 같은 정규화. 공백만 있는 입력을 여기서 걸러낸다.
        const normalized = query.trim().replace(/\s+/g, ' ');

        if (normalized.length < SEARCH_MIN) {
            setError(`검색어는 ${SEARCH_MIN}글자 이상이어야 합니다.`);
            return;
        }

        setError('');
        navigate(`/search?q=${encodeURIComponent(normalized)}`);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
            <div className="flex items-center space-x-2">
                <input
                    type="search"
                    aria-label="검색어"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={SEARCH_MAX}
                    placeholder="제목·본문으로 검색"
                    className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 whitespace-nowrap"
                >
                    검색
                </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </form>
    );
};

export default SearchBox;
