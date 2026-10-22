(function () {
  if (sessionStorage.getItem('bf_recovered')) return;
  function recover() {
    sessionStorage.setItem('bf_recovered', '1');
    var done = function () { window.location.reload(); };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })
        .catch(function () {})
        .then(function () {
          if (window.caches && caches.keys) {
            caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }).catch(function () {}).finally(done);
          } else {
            done();
          }
        });
    } else {
      done();
    }
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT' && t.src && t.src.indexOf('/assets/') !== -1) {
      recover();
    }
  }, true);
})();
