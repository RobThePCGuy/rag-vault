import { FileList } from '../components/Files'
import { Spinner } from '../components/ui'
import { useFiles } from '../hooks'

export function FilesPage() {
  const { files, isLoading, error, deleteFile, isDeleting } = useFiles()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ingested Files</h1>
          <p className="text-gray-600">Manage your knowledge base content.</p>
        </div>
        {files.length > 0 && (
          <span className="text-sm text-gray-500">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="text-gray-400" />
          <span className="ml-3 text-gray-500">Loading files...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading files</p>
          <p className="text-sm">{error.message}</p>
        </div>
      ) : (
        <FileList files={files} onDelete={deleteFile} isDeleting={isDeleting} />
      )}
    </div>
  )
}
