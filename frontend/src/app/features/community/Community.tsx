import { Heart, Image as ImageIcon, MoreHorizontal, Plus, User } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { BottomNav } from "../../components/BottomNav";

interface Post {
  id: string;
  author: string;
  timeAgo: string;
  title: string;
  content: string;
  likes: number;
  isLiked?: boolean;
}

const mockPosts: Post[] = [
  {
    id: "1",
    author: "김핏터",
    timeAgo: "2시간 전",
    title: "오늘의 등 운동 완료!",
    content: "데드리프트 100kg 드디어 성공했습니다. 꾸준히 하니까 확실히 늘긴 하네요. 다들 득근하세요!",
    likes: 124,
    isLiked: true,
  },
  {
    id: "2",
    author: "다이어터제이",
    timeAgo: "5시간 전",
    title: "건강한 저녁 식단",
    content: "닭가슴살 샐러드에 올리브유 살짝 뿌려서 먹었어요. 클린한 식단으로 마무리하니 기분 좋네요 🥗",
    likes: 85,
    isLiked: false,
  },
  {
    id: "3",
    author: "런닝맨",
    timeAgo: "어제",
    title: "아침 공복 유산소",
    content: "상쾌한 아침 공기 마시며 5km 뛰고 왔습니다. 확실히 아침에 뛰면 하루 종일 활력이 도네요.",
    likes: 210,
    isLiked: false,
  }
];

export function Community() {
  const navigate = useNavigate();
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
          {mockPosts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5, ease: "easeOut" }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
            <User size={20} className="text-white/60" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-white/90">{post.author}</span>
            <span className="text-[12px] text-white/40">{post.timeAgo}</span>
          </div>
        </div>
        <button className="text-white/40 hover:text-white/80 p-1">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="px-4">
        <div className="w-full h-[160px] rounded-[16px] overflow-hidden relative bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-2">
          <ImageIcon size={32} className="text-white/20" />
          <span className="text-[13px] text-white/40 font-medium">첨부된 사진</span>
        </div>
      </div>

      <div className="p-5 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-4 mb-1">
          <button className={`flex items-center gap-1.5 ${post.isLiked ? 'text-[#3FFDD4]' : 'text-white/60'} transition-colors`}>
            <Heart size={22} className={post.isLiked ? 'fill-[#3FFDD4]' : ''} />
            <span className="text-[14px] font-medium">{post.likes}</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-[16px] font-semibold text-white/90">{post.title}</h3>
          <p className="text-[14px] text-white/60 leading-relaxed line-clamp-2">
            {post.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}