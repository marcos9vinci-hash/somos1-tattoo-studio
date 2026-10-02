import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "memorizeai-7b8fd",
  appId: "1:287874618983:web:30718f0f4f5ad68cb4e6c2",
  apiKey: "AIzaSyAhIXcG4ReuncxNBZSqjXYOu7Exka_TNo0",
  authDomain: "memorizeai-7b8fd.firebaseapp.com",
  storageBucket: "memorizeai-7b8fd.firebasestorage.app",
  messagingSenderId: "287874618983"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-dcd3cc7e-f58b-453b-a948-88e194766ac9");

async function checkDatabase() {
  console.log('=== LENDO DADOS REAIS DO FIRESTORE (SOMOS 1) ===\n');
  
  // 1. Users
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`TOTAL USUARIOS (users): ${usersSnap.size}`);
  usersSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`- [User ${d.id}] Nome: "${data.name || data.displayName || 'Sem nome'}", Tel: "${data.phone || data.phoneNumber || 'Sem tel'}", Role: "${data.role || 'user'}", Saldo: R$ ${data.credits || 0}`);
  });

  // 2. Bookings
  const bookingsSnap = await getDocs(collection(db, 'bookings'));
  console.log(`\nTOTAL AGENDAMENTOS (bookings): ${bookingsSnap.size}`);
  bookingsSnap.docs.forEach(d => {
    const b = d.data();
    console.log(`- [Booking ${d.id}] Cliente: "${b.userName || 'N/A'}", Tel: "${b.userPhone || 'N/A'}", Data: "${b.date} ${b.time}", Status: "${b.status}", Valor: R$ ${b.priceEstimated || b.valor_estimado || 0}`);
  });

  // 3. CRM Leads
  const leadsSnap = await getDocs(collection(db, 'crm_leads'));
  console.log(`\nTOTAL LEADS CRM (crm_leads): ${leadsSnap.size}`);
  leadsSnap.docs.forEach(d => {
    const l = d.data();
    console.log(`- [Lead ${d.id}] Nome: "${l.nome}", Tel: "${l.telefone}", Estágio: "${l.estagio}", Origem: "${l.origem}", Temp: "${l.temperatura}"`);
  });

  // 4. CRM Clientes
  const clientesSnap = await getDocs(collection(db, 'crm_clientes'));
  console.log(`\nTOTAL CLIENTES CRM (crm_clientes): ${clientesSnap.size}`);
  clientesSnap.docs.forEach(d => {
    const c = d.data();
    console.log(`- [Cliente ${d.id}] Nome: "${c.nome}", Tel: "${c.telefone}", Temp: "${c.bucketTemperatura}", Tattoos: ${c.totalTatuagens}, LTV: R$ ${c.totalGastoHistorico}`);
  });

  process.exit(0);
}

checkDatabase().catch(err => {
  console.error('Erro ao ler Firestore:', err);
  process.exit(1);
});
