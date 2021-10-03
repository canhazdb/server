import logslot from 'logslot';
import c from '../../constants.js';
import onlyOnce from '../../utils/onlyOnce.js';
const log = logslot('canhazdb.conflicts');

async function resolveConflict (context, conflict) {
  try {
    const result = await context.thisNode.client
      .send(c[conflict.method], conflict.request);

    if (![c.STATUS_CREATED, c.STATUS_OK].includes(result.command)) {
      throw Object.assign(new Error('conflict could not resolve'), { result });
    }

    return context.sendToAllNodes(context, c.CONFLICT_RESOLVE, {
      [c.INTERNAL]: true,
      [c.DATA]: conflict
    });
  } catch (error) {
    log.error('could not resolve conflict', error);
  }
}

const syncServerHealth = onlyOnce(
  async function syncServerHealth (context) {
    const ownConflicts = context.conflicts.items
      .filter(conflict => !conflict.resolved && conflict.nodeName === context.thisNode.name);

    if (ownConflicts.length > 0) {
      context.thisNode.status = 'unhealthy';

      await Promise.all(
        ownConflicts
          .filter(conflict => !conflict.resolved)
          .map(resolveConflict.bind(null, context))
      );

      return;
    }

    const totalNodes = context.nodes.length;
    const onlineNodes = context.nodes.filter(node => node.online).length;
    const percentageOnline = parseFloat((onlineNodes / totalNodes).toFixed(2));

    if (percentageOnline > 0.5) {
      context.thisNode.status = 'healthy';
    } else {
      log.warn('less than 51% of the cluster is online', { onlineNodes, totalNodes, percentageOnline });
      context.thisNode.status = 'unhealthy';
    }
  }
);

async function isConflictResolvedOnAllNodes (context, conflict) {
  const nodeResults = await context.sendToAllNodes(context, c.CONFLICT_GET, {
    [c.INTERNAL]: true,
    [c.RESOURCE_ID]: conflict.id
  });

  const allResolved = nodeResults.every(response => {
    if (response.command !== c.STATUS_OK) {
      return false;
    }

    const result = response.json();
    return result[c.DATA].resolved;
  });

  return allResolved;
}

const cleanupResolvedConflicts = onlyOnce(
  async function cleanupResolvedConflicts (context) {
    const resolvedConflicts = context.conflicts.items
      .filter(conflict => conflict.resolved && conflict.nodeName === context.thisNode.name);

    await Promise.all(
      resolvedConflicts.map(async conflict => {
        const fullyResolved = await isConflictResolvedOnAllNodes(context, conflict);
        if (fullyResolved) {
          context.sendToAllNodes(context, c.CONFLICT_CLEANUP, {
            [c.INTERNAL]: true,
            [c.DATA]: conflict
          });
        }
      })
    );
  }
);

function upsertConflict (context, data) {
  const existing = context.conflicts.items
    .find(item => item.id === data.id);

  if (existing) {
    return;
  }

  context.conflicts.items.push(data);
}

async function conflictRaiseHandler ({ context, socket, request, response }) {
  const requestData = request.json();
  const data = requestData[c.DATA];

  upsertConflict(context, data);
}

async function conflictResolveHandler ({ context, socket, request, response }) {
  const requestData = request.json();
  const data = requestData[c.DATA];

  const existing = context.conflicts.items
    .find(item => item.id === data.id);

  if (!existing) {
    return;
  }

  existing.resolved = true;
  response.reply(c.STATUS_OK);
}

async function conflictCleanupHandler ({ context, socket, request, response }) {
  const requestData = request.json();
  const data = requestData[c.DATA];

  const existingIndex = context.conflicts.items
    .findIndex(item => item.id === data.id);

  if (existingIndex === -1) {
    return;
  }

  context.conflicts.items.splice(existingIndex, 1);

  response.reply(c.STATUS_OK);
}

async function conflictGetHandler ({ context, socket, request, response }) {
  const requestData = request.json();
  const resourceId = requestData[c.RESOURCE_ID];

  if (resourceId) {
    const conflict = context.conflicts.items.find(item => item.id === resourceId);

    if (!conflict) {
      response.reply(c.STATUS_NOT_FOUND);
      return;
    }

    response.reply(c.STATUS_OK, {
      [c.DATA]: conflict
    });

    return;
  }

  response.reply(c.STATUS_OK, {
    [c.DATA]: context.conflicts.items
  });
}

function conflictsModule (context) {
  context.conflicts = {
    items: []
  };

  context.controllers.internal.add({
    command: c.CONFLICT_GET,
    handler: conflictGetHandler
  });

  context.controllers.internal.add({
    command: c.CONFLICT_RAISE,
    handler: conflictRaiseHandler
  });

  context.controllers.internal.add({
    command: c.CONFLICT_RESOLVE,
    handler: conflictResolveHandler
  });

  context.controllers.internal.add({
    command: c.CONFLICT_CLEANUP,
    handler: conflictCleanupHandler
  });

  context.on('node.connected', async function (node) {
    const conflicts = await node.client.send(c.CONFLICT_GET, {
      [c.INTERNAL]: true
    });

    conflicts.json()[c.DATA].forEach(conflictData => {
      upsertConflict(context, conflictData);
    });
  });

  context.on('conflict', async function (data) {
    return context.sendToAllNodes(context, c.CONFLICT_RAISE, {
      [c.INTERNAL]: true,
      [c.DATA]: data
    });
  });

  const syncTimer = setInterval(() => {
    if (!context?.thisNode?.client) {
      return;
    }
    syncServerHealth(context);
  }, context.settings.conflictSyncInterval);

  const cleanupTimer = setInterval(() => {
    if (!context?.thisNode?.client) {
      return;
    }
    cleanupResolvedConflicts(context);
  }, context.settings.conflictCleanupInterval);

  return {
    cleanup: () => {
      clearInterval(syncTimer);
      clearInterval(cleanupTimer);
    }
  };
}

export default conflictsModule;