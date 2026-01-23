"use client";

import React from "react";
import { Notification } from "../../lib/utils/notifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onRemove,
}) => {
  const { id, type, title, message, timestamp, read, link } = notification;

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
            <svg
              className="w-4 h-4 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <svg
              className="w-4 h-4 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const [timeAgo, setTimeAgo] = React.useState("");

  React.useEffect(() => {
    const formatTimestamp = (ts: number) => {
      const now = Date.now();
      const diff = now - ts;
      if (diff < 60000) return "Just now";
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return new Date(ts).toLocaleDateString();
    };

    setTimeAgo(formatTimestamp(timestamp));
  }, [timestamp]);

  return (
    <div
      className={`flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50 ${!read ? "bg-blue-50/30 dark:bg-blue-900/5" : ""}`}
      onClick={() => !read && onMarkAsRead(id)}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p
            className={`text-sm font-medium ${!read ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {title}
          </p>
          <span className="text-xs text-zinc-400 whitespace-nowrap ml-2">
            {timeAgo}
          </span>
        </div>
        <p
          className={`text-xs ${!read ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-500"} line-clamp-2`}
        >
          {message}
        </p>
        {link && (
          <a
            href={link}
            className="inline-block mt-2 text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View details →
          </a>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
        className="text-zinc-400 hover:text-red-500 transition-colors"
        aria-label="Remove notification"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

export default NotificationItem;
