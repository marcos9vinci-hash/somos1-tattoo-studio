import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postService } from "@/services/postService";
import { useAuth } from "@/contexts/AuthContext";

export const usePosts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.uid || (user as any)?.id || 'guest_admin';
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['posts', userId],
    queryFn: async ({ pageParam }) => {
      // 1. Tentar carregar do backend
      try {
        const res = await postService.loadPosts(userId, 20, pageParam as number);
        if (res?.posts && res.posts.length > 0) return res;
      } catch (err) {
        console.warn("Backend posts offline or unavailable, fallback to local cache:", err);
      }
      
      // 2. Fallback para localStorage
      try {
        const saved = localStorage.getItem('galeria_posts_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { posts: parsed };
        }
      } catch (e) {}

      return { posts: [] };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (!lastPage || !lastPage.posts || lastPage.posts.length < 20) return undefined;
      return (lastPageParam as number) + 20;
    },
    enabled: true,
  });

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  const mutation = useMutation({
    mutationFn: async (post: any) => {
      try {
        return await postService.savePost(userId, post);
      } catch (err) {
        console.warn("Failed to persist post to backend, storing locally:", err);
        return post.id || `local_${Date.now()}`;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', userId] });
    }
  });

  const setPosts = (newPosts: any[]) => {
    try {
      localStorage.setItem('galeria_posts_v3', JSON.stringify(newPosts));
    } catch (e) {}
    
    queryClient.setQueryData(['posts', userId], (oldData: any) => {
      return {
        pages: [{ posts: newPosts }],
        pageParams: [0]
      };
    });
  };

  return { posts, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, savePosts: mutation.mutate, setPosts, quotaWarning: false };
};
