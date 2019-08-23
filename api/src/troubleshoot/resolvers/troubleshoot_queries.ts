import { Context } from "../../context";
import { Stores } from "../../schema/stores";
import _ from "lodash";
import { ReplicatedError } from "../../server/errors";

export function TroubleshootQueries(stores: Stores) {
  return {
    async watchCollectors(root: any, { watchId }, context: Context) {
      // watchCollectors is called by the support bundle container, and is not authenticated
      const collector = await stores.troubleshootStore.getPreferedWatchCollector(watchId);

      return {
        spec: collector.spec,
        hydrated: collector.spec,
      };
    },

    async listSupportBundles(root: any, { watchSlug }, context: Context) {
      const watch = await context.findWatch(watchSlug);
      let supportBundles = await stores.troubleshootStore.listSupportBundles(watch.id);

      const watchIds = await stores.watchStore.listChildWatchIds(watch.id);      
      for (const watchId of watchIds) {
        const childBundles = await stores.troubleshootStore.listSupportBundles(watchId);
        supportBundles = supportBundles.concat(childBundles);
      }

      return _.map(supportBundles, (supportBundle) => {
        return supportBundle.toSchema();
      });
    },

    async getSupportBundle(root: any, { watchSlug }, context: Context) {
      const supportBundle = await stores.troubleshootStore.getSupportBundle(watchSlug);
      const watch = context.getWatch(supportBundle.watchId);
      if (!watch) {
        throw new ReplicatedError("not found");
      }

      return supportBundle.toSchema();
    },

    async supportBundleFiles(root, { bundleId, fileNames }, context: Context, { }): Promise<any> {
      const bundle = await stores.troubleshootStore.getSupportBundle(bundleId);
      const files = await bundle.getFiles(bundle, fileNames);
      const jsonFiles = JSON.stringify(files.files);
      if (jsonFiles.length >= 5000000) {
        throw new ReplicatedError(`File is too large, the maximum allowed length is 5000000 but found ${jsonFiles.length}`);
      }
      return jsonFiles;
    },

    async getSupportBundleCommand(root, { watchSlug }, context: Context): Promise<string> {
      const watchId = await stores.watchStore.getIdFromSlug(watchSlug);
      const watch = await context.getWatch(watchId);
      const bundleCommand = await stores.troubleshootStore.getSupportBundleCommand(watch.slug);

      return bundleCommand;
    }

  };
}
