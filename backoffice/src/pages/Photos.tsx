import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { photoService, Photo } from '../services/api';
import { 
  Camera, 
  Upload, 
  Search,
  Download,
  Trash2,
  Eye,
  Calendar,
  User,
  Grid,
  List,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';

const PhotosPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (taskFilter) filters.task_id = taskFilter;
      if (userFilter) filters.user_id = userFilter;
      if (dateFilter) filters.date = dateFilter;
      
      const photosData = await photoService.getPhotos(filters);
      setPhotos(photosData);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  }, [taskFilter, userFilter, dateFilter]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleUploadPhoto = async (formData: FormData) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await photoService.uploadPhoto(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(async () => {
        await loadPhotos();
        setShowUploadModal(false);
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePhoto = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
      try {
        await photoService.deletePhoto(id);
        await loadPhotos();
      } catch (error) {
        console.error('Error deleting photo:', error);
      }
    }
  };

  const handleDownloadPhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename || 'photo.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
    }
  };

  const filteredPhotos = photos.filter(photo =>
    photo.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.task_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fotos</h1>
          <p className="text-gray-600 mt-1">Gestión de fotos del proyecto</p>
        </div>
        {(currentUser?.role === 'DIOS' || currentUser?.role === 'ENCARGADO' || currentUser?.role === 'TRABAJADOR') && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Subir Foto
          </button>
        )}
      </div>

      {/* Filters and View Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar fotos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las tareas</option>
            </select>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los usuarios</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <div className="text-center py-12">
          <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay fotos</h3>
          <p className="text-gray-500">
            {searchTerm || taskFilter || userFilter || dateFilter 
              ? 'No hay fotos que coincidan con los filtros' 
              : 'Sube tu primera foto para comenzar'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadPhoto}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Photo Viewer Modal */}
      {showViewerModal && selectedPhoto && (
        <PhotoViewerModal
          photo={selectedPhoto}
          onClose={() => setShowViewerModal(false)}
          onDownload={handleDownloadPhoto}
          onDelete={handleDeletePhoto}
          canDelete={currentUser?.role === 'DIOS' || currentUser?.role === 'ENCARGADO'}
        />
      )}
    </div>
  );
};

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void;
  onUpload: (formData: FormData) => void;
  isUploading: boolean;
  uploadProgress: number;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, isUploading, uploadProgress }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [taskId, setTaskId] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setError('');
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setError('Por favor, selecciona un archivo de imagen válido');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Por favor, selecciona una imagen');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    if (description) formData.append('description', description);
    if (taskId) formData.append('task_id', taskId);

    onUpload(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Subir Foto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Quitar imagen
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                    Seleccionar Imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500">
                  O arrastra una imagen aquí
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué muestra esta foto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Task Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarea relacionada (opcional)
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar tarea</option>
            </select>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subiendo imagen...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? 'Subiendo...' : 'Subir Foto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Photo Viewer Modal Component
interface PhotoViewerModalProps {
  photo: Photo;
  onClose: () => void;
  onDownload: (photo: Photo) => void;
  onDelete: (id: number) => void;
  canDelete: boolean;
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose, onDownload, onDelete, canDelete }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const rotate = () => setRotation(prev => prev + 90);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="relative max-w-6xl max-h-full w-full h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{photo.filename || 'Sin nombre'}</h3>
            {photo.description && (
              <p className="text-sm text-gray-300">{photo.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center overflow-hidden relative">
          <div
            className="transition-transform duration-300"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          >
            <img
              src={photo.url}
              alt={photo.description || photo.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 text-white p-4 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={zoomIn}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={rotate}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">
                Zoom: {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onDownload(photo)}
                className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              {canDelete && (
                <button
                  onClick={() => {
                    onDelete(photo.id);
                    onClose();
                  }}
                  className="px-3 py-2 bg-red-600 rounded hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>

          {/* Photo Info */}
          <div className="mt-4 text-sm text-gray-400 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="block text-gray-500">Subido por:</span>
              <span>{photo.uploaded_name || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-gray-500">Fecha:</span>
              <span>{new Date(photo.created_at).toLocaleDateString('es-ES')}</span>
            </div>
            {photo.task_title && (
              <div>
                <span className="block text-gray-500">Tarea:</span>
                <span>{photo.task_title}</span>
              </div>
            )}
            {photo.file_size && (
              <div>
                <span className="block text-gray-500">Tamaño:</span>
                <span>{Math.round(photo.file_size / 1024)} KB</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotosPage;
