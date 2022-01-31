/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useEffect, Fragment, useMemo, useRef } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiFieldSearch,
  EuiSelect,
  EuiSelectOption,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fieldWildcardMatcher } from '../../../../../kibana_utils/public';
import {
  DataView,
  DataViewField,
  DataViewsPublicPluginStart,
  META_FIELDS,
} from '../../../../../../plugins/data_views/public';
import { useKibana } from '../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../types';
import { createEditIndexPatternPageStateContainer } from '../edit_index_pattern_state_container';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS, TAB_SOURCE_FILTERS } from '../constants';
import { SourceFiltersTable } from '../source_filters_table';
import { IndexedFieldsTable } from '../indexed_fields_table';
import { ScriptedFieldsTable } from '../scripted_fields_table';
import { getTabs, getPath, convertToEuiSelectOption } from './utils';
import { getFieldInfo } from '../../utils';

interface TabsProps extends Pick<RouteComponentProps, 'history' | 'location'> {
  indexPattern: DataView;
  fields: DataViewField[];
  saveIndexPattern: DataViewsPublicPluginStart['updateSavedObject'];
  refreshFields: () => void;
}

const searchAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.searchAria',
  {
    defaultMessage: 'Search fields',
  }
);

const filterAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.filterAria',
  {
    defaultMessage: 'Filter field types',
  }
);

const schemaAriaLabel = i18n.translate('indexPatternManagement.editIndexPattern.fields.schema', {
  defaultMessage: 'Schema',
});

const schemaOptionRuntime = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.runtime',
  {
    defaultMessage: 'Runtime Fields',
  }
);

const schemaOptionIndexed = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.indexed',
  {
    defaultMessage: 'Indexed Fields',
  }
);

const filterPlaceholder = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.filterPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

const addFieldButtonLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.addFieldButtonLabel',
  {
    defaultMessage: 'Add field',
  }
);

export function Tabs({
  indexPattern,
  saveIndexPattern,
  fields,
  history,
  location,
  refreshFields,
}: TabsProps) {
  const { application, uiSettings, docLinks, dataViewFieldEditor, overlays, theme } =
    useKibana<IndexPatternManagmentContext>().services;
  const [fieldFilter, setFieldFilter] = useState<string>('');
  const [indexedFieldTypeFilter, setIndexedFieldTypeFilter] = useState<string>('');
  const [schemaFieldTypeFilter, setSchemaFieldTypeFilter] = useState<string>('');
  const [scriptedFieldLanguageFilter, setScriptedFieldLanguageFilter] = useState<string>('');
  const [indexedFieldTypes, setIndexedFieldType] = useState<EuiSelectOption[]>([]);
  const [scriptedFieldLanguages, setScriptedFieldLanguages] = useState<EuiSelectOption[]>([]);
  const [syncingStateFunc, setSyncingStateFunc] = useState<any>({
    getCurrentTab: () => TAB_INDEXED_FIELDS,
  });
  const closeEditorHandler = useRef<() => void | undefined>();
  const { DeleteRuntimeFieldProvider } = dataViewFieldEditor;

  const refreshFilters = useCallback(() => {
    const tempIndexedFieldTypes: string[] = [];
    const tempScriptedFieldLanguages: string[] = [];
    indexPattern.fields.getAll().forEach((field) => {
      if (field.scripted) {
        if (field.lang) {
          tempScriptedFieldLanguages.push(field.lang);
        }
      } else {
        // for conflicted fields, add conflict as a type
        if (field.type === 'conflict') {
          tempIndexedFieldTypes.push('conflict');
        }
        if (field.esTypes) {
          // add all types, may be multiple
          field.esTypes.forEach((item) => tempIndexedFieldTypes.push(item));
        }
      }
    });

    setIndexedFieldType(convertToEuiSelectOption(tempIndexedFieldTypes, 'indexedFiledTypes'));
    setScriptedFieldLanguages(
      convertToEuiSelectOption(tempScriptedFieldLanguages, 'scriptedFieldLanguages')
    );
  }, [indexPattern]);

  const closeFieldEditor = useCallback(() => {
    if (closeEditorHandler.current) {
      closeEditorHandler.current();
    }
  }, []);

  const openFieldEditor = useCallback(
    (fieldName?: string) => {
      closeEditorHandler.current = dataViewFieldEditor.openEditor({
        ctx: {
          dataView: indexPattern,
        },
        onSave: refreshFields,
        fieldName,
      });
    },
    [dataViewFieldEditor, indexPattern, refreshFields]
  );

  useEffect(() => {
    refreshFilters();
  }, [indexPattern, indexPattern.fields, refreshFilters]);

  useEffect(() => {
    return () => {
      // When the component unmounts, make sure to close the field editor
      closeFieldEditor();
    };
  }, [closeFieldEditor]);

  const fieldWildcardMatcherDecorated = useCallback(
    (filters: string[]) => fieldWildcardMatcher(filters, uiSettings.get(META_FIELDS)),
    [uiSettings]
  );

  const userEditPermission = !!application?.capabilities?.indexPatterns?.save;
  const getFilterSection = useCallback(
    (type: string) => {
      const schemaOptions = [
        {
          value: '',
          text: schemaAriaLabel,
        },
        {
          value: 'runtime',
          text: schemaOptionRuntime,
        },
        {
          value: 'indexed',
          text: schemaOptionIndexed,
        },
      ];

      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiFieldSearch
              fullWidth
              placeholder={filterPlaceholder}
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              data-test-subj="indexPatternFieldFilter"
              aria-label={searchAriaLabel}
            />
          </EuiFlexItem>
          {type === TAB_INDEXED_FIELDS && indexedFieldTypes.length > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup wrap={false} gutterSize="none">
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      options={indexedFieldTypes}
                      value={indexedFieldTypeFilter}
                      onChange={(e) => setIndexedFieldTypeFilter(e.target.value)}
                      data-test-subj="indexedFieldTypeFilterDropdown"
                      aria-label={filterAriaLabel}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      options={schemaOptions}
                      value={schemaFieldTypeFilter}
                      onChange={(e) => setSchemaFieldTypeFilter(e.target.value)}
                      data-test-subj="schemaFieldTypeFilterDropdown"
                      aria-label={schemaAriaLabel}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {userEditPermission && (
                <EuiFlexItem grow={false}>
                  <EuiButton fill onClick={() => openFieldEditor()} data-test-subj="addField">
                    {addFieldButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </>
          )}
          {type === TAB_SCRIPTED_FIELDS && scriptedFieldLanguages.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={scriptedFieldLanguages}
                value={scriptedFieldLanguageFilter}
                onChange={(e) => setScriptedFieldLanguageFilter(e.target.value)}
                data-test-subj="scriptedFieldLanguageFilterDropdown"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [
      fieldFilter,
      indexedFieldTypeFilter,
      indexedFieldTypes,
      schemaFieldTypeFilter,
      scriptedFieldLanguageFilter,
      scriptedFieldLanguages,
      openFieldEditor,
      userEditPermission,
    ]
  );

  const getContent = useCallback(
    (type: string) => {
      switch (type) {
        case TAB_INDEXED_FIELDS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <DeleteRuntimeFieldProvider dataView={indexPattern} onDelete={refreshFields}>
                {(deleteField) => (
                  <IndexedFieldsTable
                    fields={fields}
                    indexPattern={indexPattern}
                    fieldFilter={fieldFilter}
                    fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                    indexedFieldTypeFilter={indexedFieldTypeFilter}
                    schemaFieldTypeFilter={schemaFieldTypeFilter}
                    helpers={{
                      editField: openFieldEditor,
                      deleteField,
                      getFieldInfo,
                    }}
                    openModal={overlays.openModal}
                    theme={theme}
                  />
                )}
              </DeleteRuntimeFieldProvider>
            </Fragment>
          );
        case TAB_SCRIPTED_FIELDS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <ScriptedFieldsTable
                indexPattern={indexPattern}
                saveIndexPattern={saveIndexPattern}
                fieldFilter={fieldFilter}
                scriptedFieldLanguageFilter={scriptedFieldLanguageFilter}
                helpers={{
                  redirectToRoute: (field: DataViewField) => {
                    history.push(getPath(field, indexPattern));
                  },
                }}
                onRemoveField={refreshFilters}
                painlessDocLink={docLinks.links.scriptedFields.painless}
              />
            </Fragment>
          );
        case TAB_SOURCE_FILTERS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <SourceFiltersTable
                saveIndexPattern={saveIndexPattern}
                indexPattern={indexPattern}
                filterFilter={fieldFilter}
                fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                onAddOrRemoveFilter={refreshFilters}
              />
            </Fragment>
          );
      }
    },
    [
      docLinks.links.scriptedFields.painless,
      fieldFilter,
      fieldWildcardMatcherDecorated,
      fields,
      getFilterSection,
      history,
      indexPattern,
      indexedFieldTypeFilter,
      schemaFieldTypeFilter,
      refreshFilters,
      scriptedFieldLanguageFilter,
      saveIndexPattern,
      openFieldEditor,
      DeleteRuntimeFieldProvider,
      refreshFields,
      overlays,
      theme,
    ]
  );

  const euiTabs: EuiTabbedContentTab[] = useMemo(
    () =>
      getTabs(indexPattern, fieldFilter).map((tab: Pick<EuiTabbedContentTab, 'name' | 'id'>) => {
        return {
          ...tab,
          content: getContent(tab.id),
        };
      }),
    [fieldFilter, getContent, indexPattern]
  );

  const [selectedTabId, setSelectedTabId] = useState(euiTabs[0].id);

  useEffect(() => {
    const { startSyncingState, stopSyncingState, setCurrentTab, getCurrentTab } =
      createEditIndexPatternPageStateContainer({
        useHashedUrl: uiSettings.get('state:storeInSessionStorage'),
        defaultTab: TAB_INDEXED_FIELDS,
      });

    startSyncingState();
    setSyncingStateFunc({
      setCurrentTab,
      getCurrentTab,
    });
    setSelectedTabId(getCurrentTab());

    return () => {
      stopSyncingState();
    };
  }, [uiSettings]);

  return (
    <EuiTabbedContent
      tabs={euiTabs}
      selectedTab={euiTabs.find((tab) => tab.id === selectedTabId)}
      onTabClick={(tab) => {
        setSelectedTabId(tab.id);
        syncingStateFunc.setCurrentTab(tab.id);
      }}
    />
  );
}
