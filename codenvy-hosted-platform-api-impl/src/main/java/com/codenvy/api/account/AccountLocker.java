/*
 * CODENVY CONFIDENTIAL
 * __________________
 *
 *  [2012] - [2015] Codenvy, S.A.
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
package com.codenvy.api.account;

import org.eclipse.che.api.account.server.Constants;
import org.eclipse.che.api.account.server.dao.Account;
import org.eclipse.che.api.account.server.dao.AccountDao;
import org.eclipse.che.api.core.NotFoundException;
import org.eclipse.che.api.core.ServerException;
import org.eclipse.che.api.core.notification.EventService;
import org.eclipse.che.api.workspace.server.dao.Workspace;
import org.eclipse.che.api.workspace.server.dao.WorkspaceDao;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;

import static java.lang.String.format;

/**
 * Locks and unlocks account and its workspaces
 *
 * @author Sergii Leschenko
 */
public class AccountLocker {
    private static final Logger LOG = LoggerFactory.getLogger(AccountLocker.class);

    private final AccountDao      accountDao;
    private final WorkspaceDao    workspaceDao;
    private final EventService    eventService;
    private final WorkspaceLocker workspaceLocker;

    @Inject
    public AccountLocker(AccountDao accountDao, WorkspaceDao workspaceDao, EventService eventService, WorkspaceLocker workspaceLocker) {
        this.accountDao = accountDao;
        this.workspaceDao = workspaceDao;
        this.eventService = eventService;
        this.workspaceLocker = workspaceLocker;
    }

    public void unlockResources(String accountId, boolean unlockWorkspaces) {
        try {
            final Account account;
            account = accountDao.getById(accountId);
            account.getAttributes().remove(org.eclipse.che.api.account.server.Constants.RESOURCES_LOCKED_PROPERTY);
            accountDao.update(account);
        } catch (NotFoundException | ServerException e) {
            LOG.error(format("Error removing lock property from account %s .", accountId), e);
        }
        if (unlockWorkspaces) {
            try {
                for (Workspace workspace : workspaceDao.getByAccount(accountId)) {
                    workspaceLocker.unlockResources(workspace.getId());
                }
            } catch (ServerException e) {
                LOG.error(format("Error removing lock property from workspace %s .", accountId), e);
            }
        }
        eventService.publish(AccountLockEvent.accountUnlockedEvent(accountId));
    }

    public void lockResources(String accountId) {
        try {
            final Account account = accountDao.getById(accountId);
            account.getAttributes().put(Constants.RESOURCES_LOCKED_PROPERTY, "true");
            accountDao.update(account);
        } catch (ServerException | NotFoundException e) {
            LOG.error(format("Error writing lock property into account %s .", accountId), e);
        }

        eventService.publish(AccountLockEvent.accountLockedEvent(accountId));
        try {
            for (Workspace workspace : workspaceDao.getByAccount(accountId)) {
                workspaceLocker.lockResources(workspace.getId());
            }
        } catch (ServerException e) {
            LOG.error(format("Can't get account's workspaces %s for writing lock property", accountId), e);
        }
    }

    public void lock(String accountId) {
        try {
            final Account account = accountDao.getById(accountId);
            account.getAttributes().put(Constants.PAYMENT_LOCKED_PROPERTY, "true");
            accountDao.update(account);
        } catch (NotFoundException | ServerException e) {
            LOG.error(format("Error writing lock property into account %s .", accountId), e);
        }
    }

    //TODO Use this method after successfully charging of invoice
    public void unlock(String accountId) {
        try {
            final Account account;
            account = accountDao.getById(accountId);
            account.getAttributes().remove(org.eclipse.che.api.account.server.Constants.PAYMENT_LOCKED_PROPERTY);
            accountDao.update(account);
        } catch (NotFoundException | ServerException e) {
            LOG.error(format("Error removing lock property from account %s .", accountId), e);
        }
    }
}
