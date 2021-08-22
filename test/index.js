import wtfnode from 'wtfnode';
import basictap from 'basictap';

wtfnode.init();

basictap.on('finish', () => {
  setTimeout(() => {
    wtfnode.dump();
  }, 500);
});

import('./lib/driver/index.js');
import('./lib/utils/calculateAllowedErrorCount.js');
import('./lib/prepareOptions.js');

import('./features/basic.js');
// import('./features/cluster.js');
import('./features/health.js');
import('./features/notify.js');
import('./features/lock.js');
import('./features/systemCollections.js');
