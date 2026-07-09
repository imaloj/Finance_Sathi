import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB original

/**
 * Compresses an image File to a base64 data URL under ~150KB.
 */
const compressImage = (file, maxWidth = 256, quality = 0.8) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const AvatarUpload = () => {
  const { user, updateUser } = useAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const res = await api.put('/auth/avatar', { avatar: compressed });
      updateUser({ avatar: res.data.data.avatar });
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!user?.avatar) return;
    setUploading(true);
    try {
      const res = await api.delete('/auth/avatar');
      updateUser({ avatar: null });
      toast.success('Profile picture removed');
    } catch {
      toast.error('Failed to remove picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar preview */}
      <div className="relative">
        <Avatar user={user} size="xl" />
        {/* Camera overlay button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
          aria-label="Upload photo"
        >
          <Camera size={13} className="text-white" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Info + remove */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{user?.email}</p>
        {user?.avatar ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 size={11} />
            Remove photo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;
