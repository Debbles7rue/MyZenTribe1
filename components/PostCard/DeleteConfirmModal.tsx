// components/PostCard/DeleteConfirmModal.tsx
"use client";

import styles from "./styles.module.css";

interface DeleteConfirmModalProps {
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ 
  isDeleting, 
  onConfirm, 
  onCancel 
}: DeleteConfirmModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={`${styles.modalContent} ${styles.confirmModal}`} onClick={(e) => e.stopPropagation()}>
        <h2>Delete Post?</h2>
        <p>This action cannot be undone. All photos, comments, and likes will be permanently removed.</p>
        <div className={styles.modalButtons}>
          <button 
            className={styles.modalCancel}
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className={styles.modalDelete}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
