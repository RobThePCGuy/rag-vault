import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type IngestResult, ingestData, uploadFile } from '../api/client'

export function useUpload() {
  const queryClient = useQueryClient()

  const uploadMutation = useMutation<IngestResult, Error, File>({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })

  const ingestMutation = useMutation<
    IngestResult,
    Error,
    {
      content: string
      source: string
      format: 'text' | 'html' | 'markdown'
    }
  >({
    mutationFn: ({ content, source, format }) => ingestData(content, source, format),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })

  return {
    uploadFile: uploadMutation.mutate,
    ingestData: ingestMutation.mutate,
    isUploading: uploadMutation.isPending,
    isIngesting: ingestMutation.isPending,
    uploadError: uploadMutation.error,
    ingestError: ingestMutation.error,
    uploadResult: uploadMutation.data,
    ingestResult: ingestMutation.data,
    reset: () => {
      uploadMutation.reset()
      ingestMutation.reset()
    },
  }
}
