import { Heart, Image as ImageIcon, MessageCircle, Plus, Trash2, User, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { useEffect, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { BottomNav } from "../../components/BottomNav";

// --- 이미지 주소 업데이트 (더 확실한 링크로 교체) ---
const DUMMY_IMAGES = {
  gym_dark: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop",
  workout_gear: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop", // 주소 변경
  cardio_vibe: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?q=80&w=1000&auto=format&fit=crop"
};

interface Post {
  board_no: number;
  writer: string;
  upload_date: string;
  title: string;
  content: string;
  imgpath: string | null;
  likes: number;
  is_liked: boolean;       
  comments_count: number; 
}

interface Comment {
  comment_no: number;
  content: string;
  create_at: string;
  writer: string;
  board_no: number;
}

export function Community() {
  const navigate = useNavigate();
  
  // 좋아요 0, 댓글 0으로 초기화하여 실제 기능 테스트가 가능하게 설정
  const [posts, setPosts] = useState<Post[]>([
    {
      board_no: 999,
      writer: "GYMPT_마스터",
      upload_date: "2024-03-24T10:00:00",
      title: "오늘 데드리프트 180kg 성공! 🔥",
      content: "3개월 정체기 끝! 다들 오늘 오운완 하셨나요?",
      imgpath: DUMMY_IMAGES.gym_dark,
      likes: 0,
      is_liked: false,
      comments_count: 0
    },
    {
      board_no: 998,
      writer: "식단요정",
      upload_date: "2024-03-24T11:30:00",
      title: "다이어트 꿀팁 공유 🥗",
      content: "단백질 함량 꼭 체크하세요! 궁금한 점은 댓글로!",
      imgpath: DUMMY_IMAGES.workout_gear,
      likes: 0,
      is_liked: false,
      comments_count: 0
    }
  ]);

  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("gympt_access_token");
    if (!token) {
      navigate("/login");
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  }, [navigate]);

  const fetchPosts = useCallback(async () => {
    const headers = getAuthHeader();
    if (!headers) return;
    try {
      const response = await axios.get('http://localhost:8000/api/v1/board/', { headers });
      if (response.data && response.data.length > 0) {
        setPosts(response.data);
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("데이터 로드 에러:", err.message);
      if (err.response?.status === 401) navigate("/login");
    }
  }, [navigate, getAuthHeader]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      await fetchPosts();
    };
    if (isMounted) loadData();
    return () => { isMounted = false; };
  }, [fetchPosts]);

  const handleDeletePost = (board_no: number) => {
    setPosts(prev => prev.filter(p => p.board_no !== board_no));
  };

  // 좋아요 기능: 서버 통신 실패 시에도 로컬 상태를 먼저 업데이트하여 UI 반응 속도 확보
  const handleLikeUpdate = (board_no: number) => {
    setPosts(prev => prev.map(p => {
      if (p.board_no === board_no) {
        const currentlyLiked = p.is_liked;
        return {
          ...p,
          is_liked: !currentlyLiked,
          likes: currentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1
        };
      }
      return p;
    }));
  };

  const handleCommentCountUpdate = (board_no: number, type: 'plus' | 'minus') => {
    setPosts(prev => prev.map(p => {
      if (p.board_no === board_no) {
        return {
          ...p,
          comments_count: type === 'plus' ? p.comments_count + 1 : Math.max(0, p.comments_count - 1)
        };
      }
      return p;
    }));
  };

  return (
    <div className="flex justify-center items-start w-full" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
      <div 
        className="flex flex-col relative overflow-y-auto" 
        style={{ width: '100%', maxWidth: '390px', minHeight: '100dvh', backgroundColor: '#1A1A1A', paddingBottom: 88 }}
      >
        <header className="sticky top-0 z-40 bg-[#1A1A1A]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white tracking-wide">커뮤니티</h1>
          <button 
            onClick={() => navigate('/create-post')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <Plus size={20} className="text-[#3FFDD4]" />
          </button>
        </header>

        <div className="flex-1 p-5 flex flex-col gap-6">
          {posts.map((post, index) => (
            <PostCard 
              key={post.board_no} 
              post={post} 
              index={index} 
              onDelete={handleDeletePost}
              onLikeUpdate={handleLikeUpdate}
              onOpenComments={() => setActiveCommentPostId(post.board_no)}
            />
          ))}
        </div>

        <AnimatePresence>
          {activeCommentPostId && (
            <CommentsBottomSheet 
              onClose={() => setActiveCommentPostId(null)} 
              postId={activeCommentPostId}
              onCountUpdate={handleCommentCountUpdate}
            />
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}

function PostCard({ post, index, onDelete, onLikeUpdate, onOpenComments }: { 
  post: Post; index: number; onDelete: (no: number) => void; onLikeUpdate: (no: number) => void; onOpenComments: () => void;
}) {
  const navigate = useNavigate();
  // 이미지 경로 처리 최적화
  const imageUrls = post.imgpath
    ? (Array.isArray(post.imgpath) ? post.imgpath : post.imgpath.split(',')).map(path => 
        path.trim().startsWith('http') ? path.trim() : `http://localhost:8000${path.trim()}`
      ) : [];

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // 1. 먼저 UI를 업데이트 (사용자 경험 향상)
    onLikeUpdate(post.board_no);
    
    // 2. 서버 통신 시도 (실패해도 UI는 이미 변해있음)
    try {
      const token = localStorage.getItem("gympt_access_token");
      await axios.post(`http://localhost:8000/api/v1/board/${post.board_no}/likes`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) { 
      console.error("좋아요 동기화 실패:", (error as Error).message);
      // 서버 에러 시 다시 롤백하고 싶다면 여기서 onLikeUpdate를 한 번 더 호출할 수 있음
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("게시글을 삭제할까요?")) return;
    try {
      const token = localStorage.getItem("gympt_access_token");
      await axios.delete(`http://localhost:8000/api/v1/board/${post.board_no}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onDelete(post.board_no);
    } catch (error) { 
      console.error("삭제 실패:", (error as Error).message);
      alert("삭제 권한이 없습니다."); 
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden mb-2"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60"><User size={20} /></div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-white/90">{post.writer}</span>
            <span className="text-[12px] text-white/40">{post.upload_date?.split('T')[0]}</span>
          </div>
        </div>
        <button onClick={handleDelete} className="text-white/20 hover:text-red-400 p-1"><Trash2 size={18} /></button>
      </div>
      <div className="px-4" onClick={() => navigate(`/community/${post.board_no}`)}>
        <div className="w-full aspect-square rounded-[16px] overflow-hidden bg-white/5 border border-white/5">
          {imageUrls.length > 0 ? (
            <img src={imageUrls[0]} className="w-full h-full object-cover" alt="" 
                 onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=No+Image'; }} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <ImageIcon size={32} className="text-white/20" />
            </div>
          )}
        </div>
      </div>
      <div className="p-5 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className={`flex items-center gap-1.5 transition-colors ${post.is_liked ? 'text-[#3FFDD4]' : 'text-white/60'}`}>
            <Heart size={22} className={post.is_liked ? 'fill-[#3FFDD4] stroke-[#3FFDD4]' : ''} /><span className="text-[14px] font-medium">{post.likes}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpenComments(); }} className="flex items-center gap-1.5 text-white/60">
            <MessageCircle size={22} /><span className="text-[14px] font-medium">{post.comments_count}</span>
          </button>
        </div>
        <div onClick={() => navigate(`/community/${post.board_no}`)}>
          <h3 className="text-[16px] font-semibold text-white/90">{post.title}</h3>
          <p className="text-[14px] text-white/60 line-clamp-2">{post.content}</p>
        </div>
      </div>
    </motion.div>
  );
}

function CommentsBottomSheet({ onClose, postId, onCountUpdate }: { onClose: () => void; postId: number; onCountUpdate: (id: number, type: 'plus' | 'minus') => void }) {
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);

  const fetchComments = useCallback(async () => {
    const token = localStorage.getItem("gympt_access_token");
    if (!token) return;
    try {
      const response = await axios.get(`http://localhost:8000/api/v1/board/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data.comments || []);
    } catch (error) {
      console.error("댓글 로딩 에러:", (error as Error).message);
    }
  }, [postId]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchComments();
    return () => { isMounted = false; };
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const token = localStorage.getItem("gympt_access_token");

    // UI 우선 업데이트용 임시 데이터 (실제 데이터는 서버 응답으로 교체)
    try {
      if (editingCommentId) {
        const response = await axios.patch(`http://localhost:8000/api/v1/board/comments/${editingCommentId}`, 
          { content: commentInput }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setComments(prev => prev.map(c => c.comment_no === editingCommentId ? response.data : c));
        setEditingCommentId(null);
      } else {
        const response = await axios.post(`http://localhost:8000/api/v1/board/${postId}/comments`, 
          { content: commentInput }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setComments(prev => [response.data, ...prev]);
        onCountUpdate(postId, 'plus');
      }
      setCommentInput("");
    } catch (error) {
      console.error("댓글 전송 에러:", (error as Error).message);
      // 서버가 꺼져있어도 테스트하고 싶다면 아래 주석을 해제하세요.
      /*
      const tempComment = { comment_no: Date.now(), content: commentInput, writer: "테스터", create_at: new Date().toISOString(), board_no: postId };
      setComments(prev => [tempComment, ...prev]);
      onCountUpdate(postId, 'plus');
      setCommentInput("");
      */
    }
  };

  const handleEditStart = (comment: Comment) => {
    setEditingCommentId(comment.comment_no);
    setCommentInput(comment.content);
  };

  const handleDeleteComment = async (comment_no: number) => {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    try {
      const token = localStorage.getItem("gympt_access_token");
      await axios.delete(`http://localhost:8000/api/v1/board/comments/${comment_no}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(prev => prev.filter(c => c.comment_no !== comment_no));
      onCountUpdate(postId, 'minus');
    } catch (error) {
      console.error("댓글 삭제 에러:", (error as Error).message);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm max-w-[390px] mx-auto" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[101] bg-[#1A1A1A] rounded-t-[32px] border-t border-white/10 flex flex-col h-[70vh] w-full max-w-[390px]"
      >
        <div className="flex flex-col items-center pt-3 pb-4" onClick={onClose}>
          <div className="w-12 h-1.5 bg-white/20 rounded-full mb-4" />
          <h2 className="text-[16px] font-bold text-white">댓글 <span className="text-[#3FFDD4] ml-1">{comments.length}</span></h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {comments.length > 0 ? comments.map((comment) => (
            <div key={comment.comment_no} className="flex gap-3 items-start justify-between">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-white/60"><User size={16} /></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white/90">{comment.writer}</span>
                    <span className="text-[11px] text-white/30">{comment.create_at?.split('T')[0]}</span>
                  </div>
                  <p className="text-[14px] text-white/80 leading-relaxed">{comment.content}</p>
                  <div className="flex gap-3 mt-1">
                    <button onClick={() => handleEditStart(comment)} className="text-[11px] text-[#3FFDD4]/60 hover:text-[#3FFDD4] transition-colors">수정</button>
                    <button onClick={() => handleDeleteComment(comment.comment_no)} className="text-[11px] text-white/20 hover:text-red-400 transition-colors">삭제</button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 text-white/10">
              <span className="text-[14px]">첫 댓글을 남겨보세요!</span>
            </div>
          )}
        </div>
        <div className="p-4 bg-[#1A1A1A] border-t border-white/10 pb-10">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2.5 border border-white/10 focus-within:border-[#3FFDD4]/30 transition-colors">
            <input 
              type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
              placeholder={editingCommentId ? "댓글 수정 중..." : "댓글 달기..."} 
              className="flex-1 bg-transparent text-white outline-none text-[14px] placeholder:text-white/20" 
            />
            {editingCommentId && (
              <button type="button" onClick={() => { setEditingCommentId(null); setCommentInput(""); }} className="text-white/40 text-[12px] hover:text-white transition-colors">취소</button>
            )}
            <button type="submit" disabled={!commentInput.trim()} className={`${commentInput.trim() ? 'text-[#3FFDD4]' : 'text-white/10'} transition-colors`}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </>
  );
}