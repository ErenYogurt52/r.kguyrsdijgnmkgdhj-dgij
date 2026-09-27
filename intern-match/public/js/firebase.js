// Everything that talks to Firebase lives here (Auth + Cloud Firestore, modular SDK from the CDN).
// Data layout (see firebase/firestore.rules):
//   users/{uid}                 { name, email, profile, createdAt, updatedAt }
//   users/{uid}/saved/{jobId}   { job, savedAt }
//   users/{uid}/results/latest  { jobs, meta, keywordsKey, createdAt }
const V = '12.12.0';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

let A, F, auth, db;

export async function init(config) {
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`),
  ]);
  A = authMod; F = fsMod;
  const app = appMod.initializeApp(config);
  auth = A.getAuth(app);
  auth.useDeviceLanguage();
  db = F.initializeFirestore(app, { ignoreUndefinedProperties: true });
}

const toUser = (u) => (u ? {
  uid: u.uid, email: u.email, name: u.displayName || '', emailVerified: u.emailVerified,
  providers: u.providerData.map((p) => p.providerId),
} : null);

export const onUser = (cb) => A.onAuthStateChanged(auth, (u) => cb(toUser(u)));
export const currentUser = () => toUser(auth.currentUser);
export const idToken = async () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

export async function signUp({ name, email, password }) {
  const cred = await A.createUserWithEmailAndPassword(auth, email, password);
  if (name) await A.updateProfile(cred.user, { displayName: name });
  await F.setDoc(F.doc(db, 'users', cred.user.uid), { name: name || '', email, createdAt: Date.now() }, { merge: true });
  A.sendEmailVerification(cred.user).catch(() => {});
  return toUser(cred.user);
}

export async function signIn({ email, password }) {
  return toUser((await A.signInWithEmailAndPassword(auth, email, password)).user);
}

export async function signInWithGoogle() {
  const cred = await A.signInWithPopup(auth, new A.GoogleAuthProvider());
  const ref = F.doc(db, 'users', cred.user.uid);
  const snap = await F.getDoc(ref);
  if (!snap.exists()) await F.setDoc(ref, { name: cred.user.displayName || '', email: cred.user.email, createdAt: Date.now() }, { merge: true });
  return toUser(cred.user);
}

export const signOutUser = () => A.signOut(auth);
export const sendReset = (email) => A.sendPasswordResetEmail(auth, email);
export const sendVerification = () => A.sendEmailVerification(auth.currentUser);
export async function reloadUser() { await auth.currentUser.reload(); return toUser(auth.currentUser); }

export async function updateName(name) {
  await A.updateProfile(auth.currentUser, { displayName: name });
  await F.setDoc(F.doc(db, 'users', auth.currentUser.uid), { name, updatedAt: Date.now() }, { merge: true });
  return toUser(auth.currentUser);
}

async function reauth(password) {
  const u = auth.currentUser;
  if (u.providerData.some((p) => p.providerId === 'password')) {
    await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, password || ''));
  } else {
    await A.reauthenticateWithPopup(u, new A.GoogleAuthProvider());
  }
}

export async function changePassword(current, next) {
  await reauth(current);
  await A.updatePassword(auth.currentUser, next);
}

// Deletes the user's Firestore data, then the Auth account.
export async function deleteAccount(password) {
  await reauth(password);
  const uid = auth.currentUser.uid;
  const saved = await F.getDocs(F.collection(db, 'users', uid, 'saved'));
  const batch = F.writeBatch(db);
  saved.forEach((d) => batch.delete(d.ref));
  batch.delete(F.doc(db, 'users', uid, 'results', 'latest'));
  batch.delete(F.doc(db, 'users', uid));
  await batch.commit();
  await A.deleteUser(auth.currentUser);
}

/* ---------- Firestore: profile, latest results, saved jobs ---------- */
export async function getUserDoc(uid) {
  const snap = await F.getDoc(F.doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveProfile(uid, profile) {
  await F.setDoc(F.doc(db, 'users', uid), { profile, updatedAt: Date.now() }, { merge: true });
}

export async function getLatest(uid) {
  const snap = await F.getDoc(F.doc(db, 'users', uid, 'results', 'latest'));
  return snap.exists() ? snap.data() : null;
}

export async function saveLatest(uid, data) {
  await F.setDoc(F.doc(db, 'users', uid, 'results', 'latest'), { ...data, createdAt: Date.now() });
}

export async function listSaved(uid) {
  const snap = await F.getDocs(F.query(F.collection(db, 'users', uid, 'saved'), F.orderBy('savedAt', 'desc')));
  return snap.docs.map((d) => d.data());
}

export async function saveJob(uid, job) {
  const entry = { job, savedAt: Date.now() };
  await F.setDoc(F.doc(db, 'users', uid, 'saved', job.id), entry);
  return entry;
}

export const unsaveJob = (uid, jobId) => F.deleteDoc(F.doc(db, 'users', uid, 'saved', jobId));
