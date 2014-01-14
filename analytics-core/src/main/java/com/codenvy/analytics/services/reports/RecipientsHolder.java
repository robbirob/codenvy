/*
 *
 * CODENVY CONFIDENTIAL
 * ________________
 *
 * [2012] - [2013] Codenvy, S.A.
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Codenvy S.A. and its suppliers,
 * if any. The intellectual and technical concepts contained
 * herein are proprietary to Codenvy S.A.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Codenvy S.A..
 */
package com.codenvy.analytics.services.reports;

import com.codenvy.analytics.Configurator;
import com.codenvy.analytics.Utils;
import com.codenvy.analytics.services.configuration.ParameterConfiguration;
import com.codenvy.analytics.services.configuration.ParametersConfiguration;
import com.codenvy.analytics.services.configuration.XmlConfigurationManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** @author <a href="mailto:abazko@codenvy.com">Anatoliy Bazko</a> */
public class RecipientsHolder {

    private static final Logger LOG           = LoggerFactory.getLogger(RecipientsHolder.class);
    private static final String CONFIGURATION = "reports.recipients.configuration";

    private final RecipientsHolderConfiguration configuration;

    public RecipientsHolder(XmlConfigurationManager<RecipientsHolderConfiguration> configurationManager) {
        try {
            configuration = configurationManager.loadConfiguration();
        } catch (IOException e) {
            LOG.error(e.getMessage(), e);
            throw new IllegalStateException(e);
        }
    }

    public RecipientsHolder() {
        this(new XmlConfigurationManager<>(RecipientsHolderConfiguration.class,
                                           Configurator.getString(CONFIGURATION)));
    }

    public Set<String> getEmails(String groupName) throws IOException {
        return doGetEmails(groupName, Utils.newContext());
    }

    public Set<String> getEmails(String groupName, Map<String, String> context) throws IOException {
        return doGetEmails(groupName, context);
    }

    protected Set<String> doGetEmails(String groupName, Map<String, String> context) throws IOException {
        try {
            for (GroupConfiguration groupConf : configuration.getGroups()) {
                if (groupConf.getName().equals(groupName)) {
                    InitializerConfiguration initializer = groupConf.getInitializer();

                    ParametersConfiguration paramsConf = initializer.getParametersConfiguration();
                    List<ParameterConfiguration> parameters = paramsConf.getParameters();

                    String clazzName = initializer.getClazz();
                    Class<?> clazz = Class.forName(clazzName);
                    Constructor<?> constructor = clazz.getConstructor(List.class);

                    RecipientGroup recipientGroup = (RecipientGroup)constructor.newInstance(parameters);
                    return recipientGroup.getEmails(context);
                }
            }

            return Collections.emptySet();
        } catch (ClassNotFoundException | InvocationTargetException | InstantiationException
                | IllegalAccessException | NoSuchMethodException e) {
            throw new IOException(e);
        }
    }
}
