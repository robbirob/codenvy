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
package com.codenvy.ext.java.server;


import io.swagger.jaxrs.config.BeanConfig;
import io.swagger.jaxrs.config.DefaultJaxrsConfig;
import io.swagger.jaxrs.config.SwaggerContextService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * Initializes Swagger config with correct base path.
 *
 * @author Max Shaposhnik (mshaposhnik@codenvy.com)
 */
@Singleton
public class AgentSwaggerConfig extends DefaultJaxrsConfig {

    private static final Logger LOG = LoggerFactory.getLogger(AgentSwaggerConfig.class);

    @Inject
    @Named("wsagent.endpoint")
    private String agentEndpoint;

    @Override
    public void init(ServletConfig config) throws ServletException {
        try {
            BeanConfig beanConfig = new BeanConfig();
            beanConfig.setVersion("1.0");
            beanConfig.setTitle("Codenvy");
            beanConfig.setBasePath(new URL(agentEndpoint).getPath());
            beanConfig.scanAndRead();
            new SwaggerContextService()
                    .withSwaggerConfig(beanConfig)
                    .initConfig()
                    .initScanner();
        } catch (MalformedURLException e) {
             LOG.warn("Unable to initialize swagger config due to malformed agent URL.", e);
        }
    }
}
