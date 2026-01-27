import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteFile, listFiles } from '../api/client'
import { useToast } from '../contexts/ToastContext'

export function useFiles() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const {
    data: files = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['files'],
    queryFn: listFiles,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      addToast({
        type: 'success',
        title: 'File deleted',
        message: 'The file has been removed from the knowledge base.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to delete file',
        message: error.message,
      })
    },
  })

  return {
    files,
    isLoading,
    error,
    deleteFile: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
