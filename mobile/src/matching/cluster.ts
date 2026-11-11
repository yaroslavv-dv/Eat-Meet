import type { StoredProfile } from './types';

export const CLUSTER_COSINE_DISTANCE_THRESHOLD = 0.35;
export const RECOMMENDATION_LIMIT = 5;

export type PersonCluster = {
  id: string;
  memberIds: string[];
  centroid: number[];
};

export type Recommendation = {
  hostId: string;
  similarity: number;
  clusterRank: number;
};

type WorkingCluster = {
  id: number;
  memberIds: string[];
};

export function clusterProfiles(profiles: StoredProfile[]): PersonCluster[] {
  const embedded = profiles.filter(
    (profile): profile is StoredProfile & { embedding: number[] } =>
      profile.embedding != null && profile.embedding.length > 0,
  );
  if (embedded.length === 0) return [];

  const width = embedded[0].embedding.length;
  const usable = embedded.filter((profile) => profile.embedding.length === width);
  const vectors = new Map(usable.map((profile) => [profile.id, l2Normalize(profile.embedding)]));

  let clusters: WorkingCluster[] = usable.map((profile, index) => ({
    id: index,
    memberIds: [profile.id],
  }));
  let nextId = usable.length;

  while (clusters.length > 1) {
    let bestI = 0;
    let bestJ = 1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = averageLinkageDistance(clusters[i], clusters[j], vectors);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestDistance >= CLUSTER_COSINE_DISTANCE_THRESHOLD) break;

    const merged: WorkingCluster = {
      id: nextId,
      memberIds: [...clusters[bestI].memberIds, ...clusters[bestJ].memberIds],
    };
    nextId += 1;
    clusters = clusters.filter((_, index) => index !== bestI && index !== bestJ);
    clusters.push(merged);
  }

  return clusters.map((cluster) => ({
    id: `c${cluster.id}`,
    memberIds: cluster.memberIds,
    centroid: centroidOf(cluster.memberIds, vectors),
  }));
}

export function recommendHosts(
  guestId: string,
  profiles: StoredProfile[],
  limit: number = RECOMMENDATION_LIMIT,
): Recommendation[] {
  const guest = profiles.find((profile) => profile.id === guestId && profile.role === 'guest');
  if (!guest?.embedding || guest.embedding.length === 0) return [];

  const guestVector = l2Normalize(guest.embedding);
  const rankedClusters = clusterProfiles(profiles)
    .map((cluster) => ({
      cluster,
      similarity: cosineSimilarity(guestVector, cluster.centroid),
    }))
    .sort(
      (left, right) =>
        right.similarity - left.similarity || left.cluster.id.localeCompare(right.cluster.id),
    );

  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const recommendations: Recommendation[] = [];

  for (let clusterRank = 0; clusterRank < rankedClusters.length; clusterRank++) {
    const hosts = rankedClusters[clusterRank].cluster.memberIds
      .map((id) => byId.get(id))
      .filter((profile): profile is StoredProfile => profile?.role === 'host' && profile.embedding != null)
      .map((host) => ({
        hostId: host.id,
        similarity: cosineSimilarity(guestVector, l2Normalize(host.embedding as number[])),
        clusterRank,
      }))
      .sort((left, right) => right.similarity - left.similarity || left.hostId.localeCompare(right.hostId));

    for (const host of hosts) {
      if (recommendations.length >= limit) return recommendations;
      recommendations.push(host);
    }
  }

  return recommendations;
}

function averageLinkageDistance(
  left: WorkingCluster,
  right: WorkingCluster,
  vectors: Map<string, number[]>,
): number {
  let total = 0;
  let count = 0;

  for (const leftId of left.memberIds) {
    const leftVector = vectors.get(leftId);
    if (!leftVector) continue;
    for (const rightId of right.memberIds) {
      const rightVector = vectors.get(rightId);
      if (!rightVector) continue;
      total += 1 - dot(leftVector, rightVector);
      count += 1;
    }
  }

  return count === 0 ? 1 : total / count;
}

function centroidOf(ids: string[], vectors: Map<string, number[]>): number[] {
  const first = vectors.get(ids[0]);
  if (!first) return [];

  const sum = new Array<number>(first.length).fill(0);
  for (const id of ids) {
    const vector = vectors.get(id);
    if (!vector) continue;
    for (let index = 0; index < sum.length; index++) sum[index] += vector[index];
  }

  return sum.map((value) => value / ids.length);
}

function l2Normalize(vector: number[]): number[] {
  let sumSquares = 0;
  for (const value of vector) sumSquares += value * value;
  const magnitude = Math.sqrt(sumSquares);
  if (magnitude === 0) return vector.map(() => 0);
  return vector.map((value) => value / magnitude);
}

function dot(left: number[], right: number[]): number {
  let sum = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index++) sum += left[index] * right[index];
  return sum;
}

function cosineSimilarity(left: number[], right: number[]): number {
  const denominator = Math.sqrt(dot(left, left) * dot(right, right));
  if (denominator === 0) return 0;
  return dot(left, right) / denominator;
}
