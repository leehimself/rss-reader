import { useState, useRef, useEffect } from 'react';
import { useFeedStore } from '../store/feedStore';
import type { Feed } from '@shared/types';
import FeedManageDialog from './FeedManageDialog';

interface FeedActionMenuProps {
  feed: Feed;
  onRefresh: () => void;
}

export default function FeedActionMenu({ feed, onRefresh }: FeedActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { deleteFeed, fetchFeed } = useFeedStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleRefresh = async () => {
    try {
      await fetchFeed(feed.id);
      onRefresh();
    } catch (err) {
      console.error(`刷新「${feed.name}」失败:`, err);
    }
    setOpen(false);
  };

  const handleDelete = async () => {
    try {
      await deleteFeed(feed.id);
    } catch (err) {
      console.error(`删除「${feed.name}」失败:`, err);
      return;
    }
    setConfirmDelete(false);
    setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="p-1 rounded hover:bg-[var(--color-border)] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1">
            <button onClick={() => { setEditing(true); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-border)]">编辑</button>
            <button onClick={handleRefresh} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-border)]">刷新</button>
            <button onClick={() => { setConfirmDelete(true); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--color-border)]">删除</button>
          </div>
        )}
      </div>

      {editing && <FeedManageDialog onClose={() => setEditing(false)} editFeed={feed} />}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg)] rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">确认删除</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">确定要删除「{feed.name}」吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded hover:bg-[var(--color-border)]">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">删除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
