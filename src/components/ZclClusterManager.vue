<!--
Copyright (c) 2008,2020 Silicon Labs.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <div v-if="selectedEndpointTypeId.length != 0">
    <div class="row justify-between q-py-md">
      <div
        v-on:click.ctrl="showVersion"
        v-if="showPreviewTab && this.endpointId[this.selectedEndpointId]"
      >
        <q-select
          class=""
          outlined
          :options="endpoints"
          :model-value="selectedEndpointId"
          dense
          emit-value
          map-options
          @update:model-value="setSelectedEndpointType($event)"
        />
      </div>
      <div v-else class="text-h4">
        <span class="v-step-6"
          >Endpoint
          {{ this.endpointId[this.selectedEndpointId] }} Clusters</span
        >
      </div>
      <div class="row">
        <div class="v-step-7">
          <q-select
            outlined
            :model-value="filter"
            :options="filterOptions"
            dense
            @update:model-value="changeDomainFilter($event)"
            data-test="filter-input"
          />
        </div>

        <div class="q-mx-sm">
          <q-input
            dense
            outlined
            clearable
            placeholder="Search Clusters"
            @update:model-value="changeFilterString($event)"
            @clear="changeFilterString('')"
            :model-value="filterString"
            data-test="search-clusters"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div v-for="actionOption in actionOptions" :key="actionOption.label">
          <q-btn
            class="full-height"
            flat
            rounded
            @click="doActionFilter(actionOption)"
            :label="actionOption.label"
            color="primary"
          />
        </div>
      </div>
    </div>

    <q-list class="cluster-list">
      <div v-for="(domainName, index) in domainNames" :key="domainName.id">
        <div v-show="clusterDomains(domainName).length > 0">
          <q-expansion-item
            :id="domainName"
            :label="domainName"
            :ref="domainName + index"
            @update:model-value="setOpenDomain(domainName, $event)"
            :model-value="getDomainOpenState(domainName)"
            data-test="Cluster"
            header-class="bg-white text-primary"
          >
            <q-card>
              <q-card-section>
                <zcl-domain-cluster-view
                  :domainName="domainName"
                  :clusters="clusterDomains(domainName)"
                />
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </div>
      </div>
    </q-list>
  </div>
</template>
<script>
import ZclDomainClusterView from './ZclDomainClusterView.vue'
import CommonMixin from '../util/common-mixin'
import { scroll } from 'quasar'
const { getScrollTarget, setVerticalScrollPosition } = scroll

export default {
  name: 'ZclClusterManager',
  props: ['endpointTypeReference'],
  mixins: [CommonMixin],
  mounted() {
    if (this.domainNames.length > 0 && this.lastSelectedDomain) {
      this.scrollToElementById(this.lastSelectedDomain)
    }
    this.changeDomainFilter(this.filter)
  },
  watch: {
    enabledClusters() {
      this.changeDomainFilter(this.filter)
    },
    expanded() {
      this.$refs[this.$store.state.zap.domains[0] + 0][0].show()
    },
  },
  computed: {
    showPreviewTab: {
      get() {
        return this.$store.state.zap.showPreviewTab
      },
    },
    domainNames: {
      get() {
        return this.$store.state.zap.domains
      },
    },
    openDomains: {
      get() {
        return this.$store.state.zap.clusterManager.openDomains
      },
    },
    clusters: {
      get() {
        return this.$store.state.zap.clusters
      },
    },
    lastSelectedDomain: {
      get() {
        return this.$store.state.zap.clusterManager.lastSelectedDomain
      },
    },
    relevantClusters: {
      get() {
        return this.clusters.filter((cluster) =>
          this.filterString == ''
            ? true
            : cluster.label
                .toLowerCase()
                .includes(this.filterString.toLowerCase())
        )
      },
    },
    enabledClusters: {
      get() {
        return this.relevantClusters.filter((cluster) => {
          return this.isClusterEnabled(cluster.id)
        })
      },
    },
    filterOptions: {
      get() {
        return this.$store.state.zap.clusterManager.filterOptions
      },
    },
    filter: {
      get() {
        return this.$store.state.zap.clusterManager.filter
      },
    },
    filterString: {
      get() {
        return this.$store.state.zap.clusterManager.filterString
      },
    },
    actionOptions: {
      get() {
        return this.$store.state.zap.clusterManager.actionOptions
      },
    },
    isTutorialRunning: {
      get() {
        return this.$store.state.zap.isTutorialRunning
      },
    },
    expanded: {
      get() {
        return this.$store.state.zap.expanded
      },
    },

    endpoints: {
      get() {
        const endpoints = []
        for (let id in this.endpointId) {
          if (this.endpointId[id]) {
            endpoints.push({
              label: `Endpoint - ${this.endpointId[id]}`,
              value: id,
            })
          }
        }
        return endpoints
      },
    },
  },
  methods: {
    scrollToElementById(tag) {
      const el = document.getElementById(tag)
      const target = getScrollTarget(el)
      const offset = el.offsetTop
      setVerticalScrollPosition(target, offset)
    },
    clusterDomains(domainName) {
      return this.relevantClusters
        .filter((a) => {
          return a.domainName == domainName
        })
        .filter((a) => {
          return typeof this.filter.clusterFilterFn === 'function'
            ? this.filter.clusterFilterFn(a, {
                enabledClusters: this.enabledClusters,
              })
            : true
        })
        .sort(function (b, a) {
          return a.code > b.code
        })
    },
    isClusterEnabled(clusterReference) {
      return (
        this.selectionClients.includes(clusterReference) ||
        this.selectionServers.includes(clusterReference)
      )
    },
    setOpenDomain(domainName, event) {
      this.$store.dispatch('zap/setOpenDomain', {
        domainName: domainName,
        value: event,
      })
    },
    showVersion() {
      this.$serverGet(restApi.uri.version).then((result) => {
        let msg = `ZAP Version Information

 - version: ${result.data.version}
 - feature level: ${result.data.featureLevel}
 - date of relese commit: ${result.data.date}
 - hash of release commit: ${result.data.hash}`
        alert(msg)
      })
    },
    getDomainOpenState(domainName) {
      return this.openDomains[domainName] || this.filterString != ''
    },
    changeDomainFilter(filter) {
      this.$store.dispatch('zap/setDomainFilter', {
        filter: filter,
        enabledClusters: this.enabledClusters,
      })
    },
    doActionFilter(filter) {
      this.$store.dispatch('zap/doActionFilter', {
        filter: filter,
        enabledClusters: this.enabledClusters,
      })
    },
    changeFilterString(filterString) {
      this.$store.dispatch('zap/setFilterString', filterString)
    },
  },
  components: {
    ZclDomainClusterView,
  },
}
</script>

<!-- Notice lang="scss" -->
<style lang="scss">
.bar {
  padding: 15px 15px 15px 15px;
}
</style>
