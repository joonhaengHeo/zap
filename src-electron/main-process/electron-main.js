/**
 *
 *    Copyright (c) 2020 Silicon Labs
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const { app } = require('electron')
const dbApi = require('../db/db-api.js')
const { runSdkGeneration } = require('../sdk-gen/sdk-gen.js')

const Args = require('./args.js')
const {
  logError,
  logInfo,
  logInitLogFile,
  logInitStdout,
  mainDatabase,
  schemaFile,
  setDevelopmentEnv,
  setMainDatabase,
  setProductionEnv,
  sqliteFile,
} = require('../util/env.js')
const { version } = require('../../package.json')
const {
  generateCodeViaCli,
  setHandlebarTemplateDirForCli,
} = require('./menu.js')
const { loadZcl } = require('../zcl/zcl-loader.js')
const { initializeElectronUi, windowCreateIfNotThere } = require('./window.js')

import { initHttpServer, httpServerPort } from '../server/http-server.js'

logInitLogFile()

if (process.env.DEV) {
  setDevelopmentEnv()
} else {
  setProductionEnv()
}

function attachToDb(db) {
  return new Promise((resolve, reject) => {
    setMainDatabase(db)
    resolve(db)
  })
}

function startSelfCheck() {
  logInitStdout()
  logInfo('Starting self-check')
  dbApi
    .initDatabase(sqliteFile())
    .then((db) => attachToDb(db))
    .then((db) => dbApi.loadSchema(db, schemaFile(), version))
    .then((db) => loadZcl(db, args.zclPropertiesFile))
    .then(() => {
      logInfo('Self-check done!')
    })
    .catch((err) => {
      logError(err)
      throw err
    })
}

function startNormal(ui, showUrl) {
  dbApi
    .initDatabase(sqliteFile())
    .then((db) => attachToDb(db))
    .then((db) => dbApi.loadSchema(db, schemaFile(), version))
    .then((db) => loadZcl(db, args.zclPropertiesFile))
    .then((db) => initHttpServer(db, args.httpPort))
    .then(() => {
      if (ui) {
        initializeElectronUi(httpServerPort())
      } else {
        if (app.dock) {
          app.dock.hide()
        }
        if (showUrl) {
          // NOTE: this is parsed/used by Studio as the default landing page.
          console.log(`url: http://localhost:${httpServerPort()}/index.html`)
        }
      }
    })
    .catch((err) => {
      logError(err)
      throw err
    })
}
/**
 *
 *
 * @param {*} generationDir
 * @param {*} handlebarTemplateDir
 */
function applyGenerationSettings(
  generationDir,
  handlebarTemplateDir,
  zclPropertiesFilePath
) {
  logInfo('Start Generation...')
  return dbApi
    .initDatabase(sqliteFile())
    .then((db) => attachToDb(db))
    .then((db) => dbApi.loadSchema(db, schemaFile(), version))
    .then((db) =>
      loadZcl(
        db,
        zclPropertiesFilePath ? zclPropertiesFilePath : args.zclPropertiesFile
      )
    )
    .then((db) =>
      setGenerationDirAndTemplateDir(generationDir, handlebarTemplateDir)
    )
    .then((res) => app.quit())
}
/**
 *
 *
 * @param {*} generationDir
 * @param {*} handlebarTemplateDir
 * @returns Returns a promise of a generation
 */
function setGenerationDirAndTemplateDir(generationDir, handlebarTemplateDir) {
  if (handlebarTemplateDir) {
    return setHandlebarTemplateDirForCli(
      handlebarTemplateDir
    ).then((handlebarTemplateDir) => generateCodeViaCli(generationDir))
  } else {
    return generateCodeViaCli(generationDir)
  }
}

function startSdkGeneration(
  generationDir,
  handlebarTemplateDir,
  zclPropertiesFilePath
) {
  logInfo('Start SDK generation...')
  return dbApi
    .initDatabase(sqliteFile())
    .then((db) => attachToDb(db))
    .then((db) => dbApi.loadSchema(db, schemaFile(), version))
    .then((db) =>
      loadZcl(
        db,
        zclPropertiesFilePath ? zclPropertiesFilePath : args.zclPropertiesFile
      )
    )
    .then((db) =>
      runSdkGeneration({
        db: db,
        generationDir: generationDir,
        templateDir: handlebarTemplateDir,
      })
    )
    .then((res) => app.quit())
}

if (app != null) {
  app.on('ready', () => {
    var argv = args.processCommandLineArguments(process.argv)

    logInfo(argv)

    if (argv._.includes('selfCheck')) {
      startSelfCheck()
    } else if (argv._.includes('generate')) {
      // generate can have:
      // - Generation Directory (-output)
      // - Handlebar Template Directory (-template)
      // - Xml Data directory (-xml)
      applyGenerationSettings(argv.output, argv.template, argv.zclProperties)
    } else if (argv._.includes('sdkGen')) {
      startSdkGeneration(argv.output, argv.template, argv.zclProperties)
    } else {
      startNormal(!argv.noUi, argv.showUrl)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    logInfo('Activate...')
    windowCreateIfNotThere(args.httpPort)
  })

  app.on('quit', () => {
    dbApi
      .closeDatabase(mainDatabase())
      .then(() => logInfo('Database closed, shutting down.'))
  })
}

exports.loaded = true
