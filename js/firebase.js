/* ============================================================
   MARGO — js/firebase.js
   Firebase initialisation + realtime sync listeners.
   Depends on: state.js (posts, postAnalytics, postsLoaded)
   v4.3
   ============================================================ */

const firebaseConfig = {
  apiKey:            'AIzaSyA1AuUethACF_9aBqbOONjra7X5NbGnfZM',
  authDomain:        'margo-f6da4.firebaseapp.com',
  databaseURL:       'https://margo-f6da4-default-rtdb.firebaseio.com',
  projectId:         'margo-f6da4',
  storageBucket:     'margo-f6da4.firebasestorage.app',
  messagingSenderId: '150183564620',
  appId:             '1:150183564620:web:a42de7fef39740b551ebe9'
};

let isFirebaseEnabled = false;
let postsRef          = null;
let analyticsRef      = null;
let adminConfigRef    = null;
let firebaseAuth      = null;

try {
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  postsRef       = database.ref('posts');
  analyticsRef   = database.ref('analytics');
  adminConfigRef = database.ref('adminConfig');
  firebaseAuth   = firebase.auth();
  isFirebaseEnabled = true;
  console.log('Firebase OK');
} catch (e) {
  console.warn('Firebase failed:', e.message);
}

// ── Realtime listeners — started after DOM is ready ──
function startFirebaseSync() {
  if (isFirebaseEnabled) {
    postsRef.orderByChild('timestamp').limitToLast(200).on('value', snapshot => {
      const prevCount = posts.length;
      posts = [];
      snapshot.forEach(child => { const p = child.val(); p.id = child.key; posts.unshift(p); });
      posts.sort((a, b) => b.timestamp - a.timestamp);
      updateLandingStats();
      buildLyricStream();
      if (postsLoaded && posts.length > prevCount && feed.classList.contains('active')) {
        showNewPostsIndicator(posts.length - prevCount);
        newPostsAvailable = true;
      }
      postsLoaded = true;
      if (feed.classList.contains('active') && !newPostsAvailable) renderFeed();
    });

    analyticsRef.on('value', snapshot => {
      postAnalytics = snapshot.val() || {};
      buildLyricStream();
    });
  } else {
    postsLoaded = true;
    updateLandingStats();
    buildLyricStream();
  }
}
