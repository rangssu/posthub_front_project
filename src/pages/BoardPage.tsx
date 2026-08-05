// src/pages/BoardPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import Layout from '../components/Layout';
import PostTable from '../components/PostTable';
import Pagination from '../components/Pagination';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/toastStore';
import { PAGE_SIZE } from '../constants/pagination';
import type { PostSummary } from '../types/post';
import type { PageResponse } from '../types/page';

// 백엔드 BoardResponse 데이터 모양에 완벽하게 맞춘 타입 정의
interface Board {
    id: number;
    boardName: string; // 👇 [수정완료] tabName -> boardName 으로 변경!
}

/**
 * 열려 있는 다이얼로그와 그 대상.
 *
 * window.confirm/prompt는 동기라 호출부가 한 줄로 이어졌지만 다이얼로그는
 * 비동기다. "무엇에 대한 확인인지"를 여기 담아 확인 클릭 시점까지 들고 간다.
 */
type BoardDialog =
    | { kind: 'none' }
    | { kind: 'create' }
    | { kind: 'rename'; boardId: number; currentName: string }
    | { kind: 'delete'; boardId: number; boardName: string };

const BoardPage = () => {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<Board[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
    const [posts, setPosts] = useState<PostSummary[]>([]);

    // 👇 [추가] 프론트 페이징 처리를 위한 상태 추가
    const [currentPage, setCurrentPage] = useState<number>(0); // 스프링은 0페이지부터 시작
    const [totalPages, setTotalPages] = useState<number>(0);

    const [dialog, setDialog] = useState<BoardDialog>({ kind: 'none' });
    const [boardName, setBoardName] = useState('');

    // 1. 로그인 상태 확인 (토큰이 있는지)
    const isLoggedIn = !!localStorage.getItem('accessToken');
    // 게시판 관리는 관리자만 가능합니다. 백엔드도 ROLE_ADMIN을 요구하므로 UI만 숨기는 게 아닙니다.
    const isAdmin = localStorage.getItem('role') === 'ADMIN';

    /*
     * activeBoardId를 "탭을 바꾸는 지점"이 아니라 별도 effect로 관찰해 currentPage를
     * 0으로 되돌리던 코드가 있었다. 그 effect는 setState를 effect 안에서 동기 호출하는
     * 꼴이라 react-hooks/set-state-in-effect에 걸린다. 그리고 애초에 "탭이 바뀌면
     * 페이지도 되돌린다"는 건 파생 상태가 아니라 탭을 바꾸는 그 동작 자체의 일부다.
     *
     * fetchBoards는 삭제 후 재조회처럼 렌더 중간에도 실행되기 때문에 activeBoardId를
     * 상태(state)로만 읽으면 같은 틱에서 먼저 예약한 setActiveBoardId(null)이 아직
     * 반영되기 전 값을 읽게 된다. ref로 최신 값을 동기적으로 들고 있어야
     * "지금 활성 게시판이 없다"는 판단이 타이밍에 흔들리지 않는다.
     */
    const activeBoardIdRef = useRef<number | null>(null);

    const selectBoard = (boardId: number) => {
        if (boardId === activeBoardId) return;
        activeBoardIdRef.current = boardId;
        setActiveBoardId(boardId);
        setCurrentPage(0);
    };

    // 3. 페이지 렌더링 시 게시판(탭) 목록 불러오기
    const fetchBoards = async () => {
        try {
            const response = await api.get('/boards');

            // [에러 해결] 백엔드에서 배열을 바로 주는지, 객체로 포장해서 주는지 확인하여 배열만 안전하게 추출합니다.
            // 데이터가 없거나 형식이 맞지 않을 경우를 대비해 빈 배열([])을 기본값으로 설정합니다.
            const boardsData = Array.isArray(response.data) ? response.data : (response.data.content || []);

            setBoards(boardsData);

            // 추출한 배열의 길이를 기준으로 탭을 설정합니다.
            if (boardsData.length > 0) {
                // 지금 활성 게시판이 없을 때만(최초 로딩, 또는 활성 게시판 삭제 직후) 첫 탭을 자동 선택합니다.
                if (activeBoardIdRef.current === null) {
                    selectBoard(boardsData[0].id);
                }
            } else {
                activeBoardIdRef.current = null;
                setActiveBoardId(null);
                setPosts([]);
            }
        } catch (error) {
            console.error('게시판 목록 로딩 실패', error);
        }
    };

    useEffect(() => {
        // fetchBoards를 effect 밖에 두고 여기서 직접 호출하면 컴파일러가 그 안의
        // setState를 "effect 안에서 동기 호출"로 본다. 얇은 래퍼로 한 겹 감싸면
        // fetchBoards는 생성·수정·삭제 후 재조회에도 그대로 재사용할 수 있다.
        const load = async () => {
            await fetchBoards();
        };
        load();
        // fetchBoards는 매 렌더마다 새로 만들어지는 함수라 deps에 넣으면 렌더될 때마다
        // 다시 요청이 나간다. 최초 1회만 불러오는 마운트 전용 로딩이라 의도적으로 뺀다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 4. 활성화된 탭이 바뀌거나 페이지 번호(currentPage)가 바뀔 때마다 해당 게시판의 글 목록 불러오기
    useEffect(() => {
        if (activeBoardId === null) return;
        const fetchPosts = async () => {
            try {
                // size는 백엔드가 50으로 자르므로 그 아래로 요청합니다.
                // 정렬은 백엔드가 최신순으로 고정하고 있어 sort는 보내지 않습니다.
                const response = await api.get<PageResponse<PostSummary>>(
                    `/boards/${activeBoardId}/posts?page=${currentPage}&size=${PAGE_SIZE}`
                );

                // [에러 해결] 페이징 처리된 객체({ content: [...] })가 올 경우를 대비해 알맹이만 꺼냅니다.
                // 배열이 아니면 map 함수에서 에러가 나므로, 반드시 배열 형태만 상태에 저장되도록 처리합니다.
                if (response.data && response.data.content) {
                    setPosts(response.data.content);
                    setTotalPages(response.data.page?.totalPages ?? 0);
                } else {
                    const postsData = Array.isArray(response.data) ? response.data : [];
                    setPosts(postsData);
                    setTotalPages(1);
                }
            } catch (error) {
                console.error('게시글 로딩 실패', error);
            }
        };
        fetchPosts();
    }, [activeBoardId, currentPage]); // 👈 [추가] currentPage가 바뀔 때도 useEffect가 다시 실행되도록 추가

    const closeDialog = () => {
        setDialog({ kind: 'none' });
        setBoardName('');
    };

    const openCreate = () => {
        setBoardName('');
        setDialog({ kind: 'create' });
    };

    const openRename = (boardId: number, currentName: string) => {
        setBoardName(currentName);
        setDialog({ kind: 'rename', boardId, currentName });
    };

    const openDelete = (boardId: number, name: string) => {
        setDialog({ kind: 'delete', boardId, boardName: name });
    };

    const submitCreate = async () => {
        const name = boardName.trim();
        if (!name) return;

        try {
            await api.post('/boards', { boardName: name });
            toast.success('게시판을 만들었습니다.');
            closeDialog();
            fetchBoards();
        } catch (error) {
            toast.error(errorMessage(error, '게시판 생성에 실패했습니다.'));
        }
    };

    const submitRename = async () => {
        if (dialog.kind !== 'rename') return;
        const name = boardName.trim();
        if (!name || name === dialog.currentName) {
            closeDialog();
            return;
        }

        try {
            await api.put(`/boards/${dialog.boardId}`, { boardName: name });
            toast.success('게시판 이름을 바꿨습니다.');
            closeDialog();
            fetchBoards();
        } catch (error) {
            toast.error(errorMessage(error, '게시판 수정에 실패했습니다.'));
        }
    };

    const submitDelete = async () => {
        if (dialog.kind !== 'delete') return;

        try {
            await api.delete(`/boards/${dialog.boardId}`);
            toast.success('게시판을 삭제했습니다.');
            if (activeBoardId === dialog.boardId) {
                activeBoardIdRef.current = null;
                setActiveBoardId(null);
            }
            closeDialog();
            fetchBoards();
        } catch (error) {
            toast.error(errorMessage(error, '게시판 삭제에 실패했습니다.'));
        }
    };

    return (
        <Layout>
            {/* 얇은 테두리와 이름이 명확히 보이는 게시판 탭 영역 */}
            <div className="flex items-center pb-4 mb-6 space-x-3 border-b border-border overflow-x-auto">
                {boards.length === 0 && (
                    <span className="text-sm text-fg-muted">생성된 게시판이 없습니다. 우측 버튼을 눌러 추가해보세요!</span>
                )}

                {boards.map((board) => (
                    <div
                        key={board.id}
                        className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                            activeBoardId === board.id
                                ? 'bg-accent-subtle text-accent'
                                : 'text-fg-muted hover:bg-surface'
                        }`}
                    >
                        {/* 👇 [수정완료] 화면에 띄울 때도 board.boardName 사용! */}
                        <span
                            className="font-medium cursor-pointer whitespace-nowrap"
                            onClick={() => selectBoard(board.id)}
                        >
                            {board.boardName}
                        </span>

                        {/* 관리자 & 현재 선택된 탭에만 수정/삭제 버튼 노출 */}
                        {isAdmin && activeBoardId === board.id && (
                            <div className="flex items-center ml-3 space-x-2 border-l border-border pl-2">
                                <button
                                    onClick={() => openRename(board.id, board.boardName)}
                                    className="text-xs text-fg-subtle hover:text-accent transition"
                                    aria-label="게시판 이름 수정"
                                    title="게시판 이름 수정"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => openDelete(board.id, board.boardName)}
                                    className="text-xs text-fg-subtle hover:text-danger transition"
                                    aria-label="게시판 삭제"
                                    title="게시판 삭제"
                                >
                                    ❌
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* 관리자일 때만 '+ 새 게시판' 생성 버튼 */}
                {isAdmin && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={openCreate}
                        className="whitespace-nowrap"
                    >
                        + 새 게시판
                    </Button>
                )}
            </div>

            {/* 게시글 목록 테이블 */}
            <PostTable
                posts={posts}
                emptyMessage="작성된 게시글이 없습니다."
                onRowClick={(postId) => navigate(`/posts/${postId}`)}
            />

            {/* 👇 [추가] 페이징 버튼 영역 (데이터가 있을 때만 렌더링) */}
            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

            {/* 글쓰기 버튼 */}
            {isLoggedIn && activeBoardId && (
                <div className="flex justify-end mt-4">
                    <Button onClick={() => navigate(`/boards/${activeBoardId}/write`)}>
                        글쓰기
                    </Button>
                </div>
            )}

            <Dialog
                open={dialog.kind === 'create' || dialog.kind === 'rename'}
                title={dialog.kind === 'rename' ? '게시판 이름 바꾸기' : '새 게시판 만들기'}
                onClose={closeDialog}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeDialog}>취소</Button>
                        <Button onClick={dialog.kind === 'rename' ? submitRename : submitCreate}>
                            {dialog.kind === 'rename' ? '변경' : '만들기'}
                        </Button>
                    </>
                }
            >
                <Field label="게시판 이름" htmlFor="boardName">
                    <Input
                        id="boardName"
                        value={boardName}
                        onChange={(e) => setBoardName(e.target.value)}
                        placeholder="예: 자유게시판"
                    />
                </Field>
            </Dialog>

            <Dialog
                open={dialog.kind === 'delete'}
                title="게시판을 삭제할까요?"
                description={
                    dialog.kind === 'delete'
                        ? `'${dialog.boardName}'을(를) 삭제합니다. 게시글이 하나라도 남아 있으면 삭제되지 않습니다.`
                        : undefined
                }
                onClose={closeDialog}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeDialog}>취소</Button>
                        <Button variant="danger" onClick={submitDelete}>삭제</Button>
                    </>
                }
            />
        </Layout>
    );
};

export default BoardPage;
