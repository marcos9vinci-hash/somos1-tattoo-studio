import { UserProfile, Booking, BookingStatus } from '../types';

export interface ReferralNode {
  user: UserProfile;
  level: number; // 0 = root, 1 = Nível 1 (Direto), 2 = Nível 2 (Indireto), 3 = Nível 3 (Sub-indireto)
  children: ReferralNode[];
  totalTattoos: number;
  totalSpent: number;
  creditsGenerated: number;
  status: 'completed' | 'scheduled' | 'lead';
  latestBooking?: Booking;
}

export interface TreeStats {
  totalPeople: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  completedTattoos: number;
  totalCreditsGenerated: number;
}

/**
 * Constrói a árvore genealógica de indicações a partir de um usuário raiz até 3 níveis de profundidade
 */
export function buildReferralTree(
  rootUser: UserProfile,
  allUsers: UserProfile[],
  allBookings: Booking[] = [],
  maxDepth: number = 3
): ReferralNode {
  function getNodeData(user: UserProfile, level: number): ReferralNode {
    // Buscar agendamentos deste usuário
    const userBookings = allBookings.filter(b => b.userId === user.uid);
    const completedBookings = userBookings.filter(b => b.status === BookingStatus.COMPLETED);
    const scheduledBookings = userBookings.filter(
      b => b.status === BookingStatus.APPROVED || 
           b.status === BookingStatus.DEPOSIT_PAID || 
           b.status === BookingStatus.RESCHEDULED
    );

    let status: 'completed' | 'scheduled' | 'lead' = 'lead';
    if (completedBookings.length > 0) {
      status = 'completed';
    } else if (scheduledBookings.length > 0) {
      status = 'scheduled';
    }

    const totalTattoos = completedBookings.length;
    const totalSpent = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    
    // Estimativa de comissão gerada para o root baseada no nível
    let commissionRate = 0;
    if (level === 1) commissionRate = 0.10; // 10%
    else if (level === 2) commissionRate = 0.05; // 5%
    else if (level === 3) commissionRate = 0.025; // 2.5%
    
    const creditsGenerated = Math.round(totalSpent * commissionRate);

    // Buscar filhos (usuários cujo referredBy é este usuário)
    let children: ReferralNode[] = [];
    if (level < maxDepth) {
      const childUsers = allUsers.filter(u => u.referredBy === user.uid && u.uid !== user.uid);
      children = childUsers.map(child => getNodeData(child, level + 1));
    }

    return {
      user,
      level,
      children,
      totalTattoos,
      totalSpent,
      creditsGenerated,
      status,
      latestBooking: userBookings[0]
    };
  }

  return getNodeData(rootUser, 0);
}

/**
 * Calcula totais de métricas da árvore inteira
 */
export function calculateTreeStats(rootNode: ReferralNode): TreeStats {
  let level1Count = 0;
  let level2Count = 0;
  let level3Count = 0;
  let completedTattoos = 0;
  let totalCreditsGenerated = 0;

  function traverse(node: ReferralNode) {
    if (node.level === 1) level1Count++;
    else if (node.level === 2) level2Count++;
    else if (node.level === 3) level3Count++;

    if (node.level > 0) {
      completedTattoos += node.totalTattoos;
      totalCreditsGenerated += node.creditsGenerated;
    }

    node.children.forEach(traverse);
  }

  traverse(rootNode);

  return {
    totalPeople: level1Count + level2Count + level3Count,
    level1Count,
    level2Count,
    level3Count,
    completedTattoos,
    totalCreditsGenerated
  };
}

/**
 * Agrupa os nós da árvore em listas planas organizadas por nível (1, 2, 3)
 */
export function flattenTreeByLevels(rootNode: ReferralNode): Record<number, ReferralNode[]> {
  const levels: Record<number, ReferralNode[]> = {
    1: [],
    2: [],
    3: []
  };

  function traverse(node: ReferralNode) {
    if (node.level >= 1 && node.level <= 3) {
      levels[node.level].push(node);
    }
    node.children.forEach(traverse);
  }

  traverse(rootNode);
  return levels;
}
