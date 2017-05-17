/*
 *  [2012] - [2017] Codenvy, S.A.
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Codenvy S.A. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Codenvy S.A.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Codenvy S.A..
 */
package com.codenvy.wsagent.server;

import com.google.inject.Injector;
import com.google.inject.Key;
import com.google.inject.name.Names;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Singleton;
import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import java.net.MalformedURLException;
import java.net.URL;


/**
 * Sets correct WS path to the session id cookies.
 * Since if agent JSESSIONID cookie will be provided with "/" path,
 * browser will send it both to master and other agents. To prevent this,
 * each agent JSESSIONID cookie should contain unique path related to this agent,
 * for example: path="/34011_172.17.0.1/api"
 *
 * This listener should be bound in WEB.xml, because Guice binding of {@code ServletContextListener}
 * not possible in such case.
 *
 * @author Max Shaposhnik (mshaposhnik@codenvy.com)
 */
@Singleton
public class SetSessionPathListener implements ServletContextListener {

    private static final Logger LOG = LoggerFactory.getLogger(SetSessionPathListener.class);

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        try {
            final ServletContext servletContext = sce.getServletContext();
            Injector injector = (Injector)servletContext.getAttribute(Injector.class.getName());
            final String agentEndpoint = injector.getInstance(Key.get(String.class, Names.named("wsagent.endpoint")));
            servletContext.getSessionCookieConfig().setPath(new URL(agentEndpoint).getPath());
        } catch (MalformedURLException e) {
            LOG.warn("Unable to set correct session path due to malformed agent URL.", e);
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {

    }
}
