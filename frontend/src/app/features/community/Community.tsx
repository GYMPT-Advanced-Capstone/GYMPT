import { Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Plus, Trash2, User } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import axios from "axios";
import { BottomNav } from "../../components/BottomNav";

// 1. 데이터 인터페이스 정의 (백엔드 스펙에 맞춤)
interface Post {
  board_no: number;
  writer: string;
  upload_date: string;
  title: string;
  content: string;
  imgpath: string | null;
  likes: number;       // 좋아요 수
  isLiked: boolean;    // 내가 좋아요 눌렀는지 여부
  comment_count: number; // 댓글 수
}

export function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem("gympt_access_token");

      if (!token) {
        console.error("토큰이 없습니다. 로그인이 필요합니다.");
        return;
      }

      const response = await axios.get('http://localhost:8000/api/v1/board/', {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });
      
      setPosts(response.data);
    } catch (error) {
      console.error("게시글을 불러오는데 실패했습니다.", error);
    }
  };

 useEffect(() => {
    const fetchPosts = async () => {
      console.log("1. fetchPosts 시작됨"); // 흐름 파악용
      try {
        const token = localStorage.getItem("gympt_access_token");
        const response = await axios.get('http://localhost:8000/api/v1/board/', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && response.data.length > 0) {
          // 🔍 첫 번째 게시글의 모든 필드명을 다 까보자!
          console.log("✅ 서버에서 준 첫 번째 데이터 샘플:", response.data[0]);
          console.log("🔍 필드 리스트:", Object.keys(response.data[0]));
        } else {
          console.log("⚠️ 데이터는 성공적으로 가져왔으나 배열이 비어있음");
        }
        
        setPosts(response.data);
      } catch (error) {
        console.error("❌ 에러 발생:", error);
      }
    };

    fetchPosts();
  }, []);

  // 2. 삭제 후 화면에서 즉시 제거하는 함수
  const handleDeletePost = (board_no: number) => {
    setPosts(prev => prev.filter(p => p.board_no !== board_no));
  };

  const handleLikeUpdate = (board_no: number) => {
    setPosts(prev => prev.map(p => {
      if (p.board_no === board_no) {
        const currentlyLiked = p.isLiked;
        return {
          ...p,
          isLiked: !currentlyLiked, 
          likes: currentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1 
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
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <PostCard 
                key={post.board_no} 
                post={post} 
                index={index} 
                onDelete={handleDeletePost}
                onLikeUpdate={handleLikeUpdate}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-40">
              <span className="text-white/30 text-[15px] font-medium tracking-tight">
                현재 등록된 게시물이 없습니다.
              </span>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

// --- PostCard 컴포넌트 분리 ---

function PostCard({ post, index, onDelete, onLikeUpdate }: { 
  post: Post; 
  index: number;
  onDelete: (no: number) => void;
  onLikeUpdate: (no: number) => void;
}) {
  const navigate = useNavigate();
  const token = localStorage.getItem("gympt_access_token");

  // 이미지 경로 처리
  const imageUrls = post.imgpath
    ? (Array.isArray(post.imgpath) 
        ? post.imgpath 
        : post.imgpath.split(',')).map(path => 
            path.startsWith('http') ? path : `http://localhost:8000${path.trim()}`
          )
    : [];

  const formattedDate = post.upload_date ? post.upload_date.split('T')[0] : "";

  // 1. 좋아요 연동
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.post(`http://localhost:8000/api/v1/board/${post.board_no}/likes`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onLikeUpdate(post.board_no); // 부모 상태 업데이트
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
    }
  };

  // 2. 삭제 연동
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("게시글을 삭제할까요?")) return;

    try {
      await axios.delete(`http://localhost:8000/api/v1/board/${post.board_no}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onDelete(post.board_no); // 부모 목록에서 제거
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 권한이 없습니다.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5, ease: "easeOut" }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] mb-2"
      onClick={() => navigate(`/community/${post.board_no}`)} // 상세페이지 이동
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
            <User size={20} className="text-white/60" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-white/90">{post.writer}</span>
            <span className="text-[12px] text-white/40">{formattedDate}</span>
          </div>
        </div>
        <button onClick={handleDelete} className="text-white/20 hover:text-red-400 p-1 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="px-4">
        <div className="w-full aspect-square rounded-[16px] overflow-hidden relative bg-white/5 border border-white/5">
          {imageUrls.length > 0 ? (
            <img src={imageUrls[0]} alt="포스트 사진" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <ImageIcon size={32} className="text-white/20" />
              <span className="text-[13px] text-white/40">사진 없음</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-[#3FFDD4]' : 'text-white/60'}`}
          >
            <Heart size={22} className={post.isLiked ? 'fill-[#3FFDD4]' : ''} />
            <span className="text-[14px] font-medium">{post.likes}</span>
          </button>
          <div className="flex items-center gap-1.5 text-white/60">
            <MessageCircle size={22} />
            <span className="text-[14px] font-medium">{post.comment_count}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-[16px] font-semibold text-white/90">{post.title}</h3>
          <p className="text-[14px] text-white/60 line-clamp-2 leading-relaxed">{post.content}</p>
        </div>
      </div>
    </motion.div>
  );
}