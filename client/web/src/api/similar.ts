import { post, userId } from './client'

/** 照镜子动作。真实后端支持的动作：keep / mute / review / create_scene */
export async function similarAction(itemId: string, action: string, similarItemId?: string, similarity?: number) {
  const body: Record<string, unknown> = { action }
  if (similarItemId) body.similar_item_id = similarItemId
  if (similarity !== undefined) body.similarity = similarity
  return post(`/api/items/${itemId}/similar-action`, body)
}
