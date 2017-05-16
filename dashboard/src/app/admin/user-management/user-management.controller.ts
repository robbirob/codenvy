/*
 *  [2015] - [2017] Codenvy, S.A.
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
'use strict';
import {LicenseMessagesService} from '../../onprem/license-messages/license-messages.service';
import {CodenvyLicense} from '../../../components/api/codenvy-license.factory';
import {CodenvyOrganization} from '../../../components/api/codenvy-organizations.factory';


/**
 * This class is handling the controller for the admins user management
 * @author Oleksii Orel
 */
export class AdminsUserManagementCtrl {
  $q: ng.IQService;
  $log: ng.ILogService;
  $mdDialog: ng.material.IDialogService;
  cheUser: any;
  codenvyLicense: CodenvyLicense;
  licenseMessagesService: LicenseMessagesService;
  cheNotification: any;
  pagesInfo: any;
  users: Array<any>;
  usersMap: Map<string, any>;
  userFilter: {name: string};
  userOrderBy: string;
  maxItems: number;
  skipCount: number;
  isLoading: boolean;

  private confirmDialogService: any;
  private codenvyOrganization: CodenvyOrganization;
  private userOrganizationCount: {[userId: string]: number} = {};
  private cheListHelper: che.widget.ICheListHelper;

  /**
   * Default constructor.
   * @ngInject for Dependency injection
   */
  constructor($q: ng.IQService, $rootScope: che.IRootScopeService, $log: ng.ILogService,
              $mdDialog: ng.material.IDialogService, cheUser: any, codenvyLicense: CodenvyLicense,
              cheNotification: any, licenseMessagesService: LicenseMessagesService,
              confirmDialogService: any, codenvyOrganization: CodenvyOrganization,
              $scope: ng.IScope, cheListHelperFactory: che.widget.ICheListHelperFactory) {
    this.$q = $q;
    this.$log = $log;
    this.$mdDialog = $mdDialog;
    this.cheUser = cheUser;
    this.codenvyLicense = codenvyLicense;
    this.codenvyOrganization = codenvyOrganization;
    this.cheNotification = cheNotification;
    this.licenseMessagesService = licenseMessagesService;
    this.confirmDialogService = confirmDialogService;

    $rootScope.showIDE = false;

    this.isLoading = false;

    this.maxItems = 12;
    this.skipCount = 0;

    this.users = [];
    this.usersMap = this.cheUser.getUsersMap();

    this.userOrderBy = 'name';
    this.userFilter = {name: ''};

    const helperId = 'user-management';
    this.cheListHelper = cheListHelperFactory.getHelper(helperId);
    $scope.$on('$destroy', () => {
      cheListHelperFactory.removeHelper(helperId);
    });

    if (this.usersMap && this.usersMap.size > 1) {
      this.updateUsers();
    } else {
      this.isLoading = true;
      this.cheUser.fetchUsers(this.maxItems, this.skipCount).then(() => {
        this.isLoading = false;
        this.updateUsers();
      }, (error: any) => {
        this.isLoading = false;
        if (error && error.status !== 304) {
          this.cheNotification.showError(error.data && error.data.message ? error.data.message : 'Failed to retrieve the list of users.');
        }
      });
    }

    this.pagesInfo = this.cheUser.getPagesInfo();
  }

  /**
   * Callback when name is changed.
   *
   * @param str {string} a string to filter user names.
   */
  onSearchChanged(str: string): void {
    this.userFilter.name = str;
    this.cheListHelper.applyFilter('name', this.userFilter);
  }

  /**
   * Fetch user's organizations
   * @param userId {string}
   */
  fetchUserOrganizations(userId: string): void {
    let currentUser: che.IUser = this.cheUser.getUser();
    if (currentUser && currentUser.id === userId) {
      this.codenvyOrganization.fetchOrganizations().then((organizations: Array<any>) => {
        this.userOrganizationCount[userId] = organizations.length;
      });
      return;
    }
    this.codenvyOrganization.fetchUserOrganizations(userId).then((organizations: Array<any>) => {
      this.userOrganizationCount[userId] = organizations.length;
    });
  }

  /**
   * User clicked on the - action to remove the user. Show the dialog
   * @param  event {MouseEvent} - the $event
   * @param user {any} - the selected user
   */
  removeUser(event: MouseEvent, user: any): void {
    let content = 'Are you sure you want to remove \'' + user.email + '\'?';
    let promise = this.confirmDialogService.showConfirmDialog('Remove user', content, 'Delete', 'Cancel');

    promise.then(() => {
      this.isLoading = true;
      let promise = this.cheUser.deleteUserById(user.id);
      promise.then(() => {
        this.isLoading = false;
        this.codenvyLicense.fetchLicenseLegality();//fetch license legality
        this.updateUsers();
        this.licenseMessagesService.fetchMessages();
      }, (error: any) => {
        this.isLoading = false;
        this.cheNotification.showError(error.data && error.data.message ? error.data.message : 'Delete user failed.');
      });
    });
  }

  /**
   * Delete all selected users
   */
  deleteSelectedUsers(): void {
    const selectedUsers = this.cheListHelper.getSelectedItems(),
          selectedUserIds = selectedUsers.map((user: che.IUser) => {
            return user.id;
          });

    const queueLength = selectedUserIds.length;
    if (!queueLength) {
      this.cheNotification.showError('No such user.');
      return;
    }

    const confirmationPromise = this.showDeleteUsersConfirmation(queueLength);
    confirmationPromise.then(() => {
      const numberToDelete = queueLength;
      const deleteUserPromises = [];
      let isError = false;
      let currentUserId;

      selectedUserIds.forEach((userId: string) => {
        currentUserId = userId;
        this.cheListHelper.itemsSelectionStatus[userId] = false;

        let promise = this.cheUser.deleteUserById(userId);
        promise.catch((error: any) => {
          isError = true;
          this.$log.error('Cannot delete user: ', error);
        });
        deleteUserPromises.push(promise);
      });

      this.$q.all(deleteUserPromises).finally(() => {
        this.isLoading = true;

        const promise = this.cheUser.fetchUsersPage(this.pagesInfo.currentPageNumber);
        promise.then(() => {
          this.isLoading = false;
          this.updateUsers();
          this.codenvyLicense.fetchLicenseLegality();//fetch license legality
          this.licenseMessagesService.fetchMessages();
        }, (error: any) => {
          this.isLoading = false;
          this.$log.error(error);
        });

        if (isError) {
          //TODO process error message
          this.cheNotification.showError('Delete failed.');
        } else {
          if (numberToDelete === 1) {
            this.cheNotification.showInfo('Selected user has been removed.');
          } else {
            this.cheNotification.showInfo('Selected users have been removed.');
          }
        }
      });
    });
  }

  /**
   * Show confirmation popup before delete
   * @param numberToDelete {number}
   * @returns {angular.IPromise<any>}
   */
  showDeleteUsersConfirmation(numberToDelete: number): angular.IPromise<any> {
    let content = 'Are you sure you want to remove ' + numberToDelete + ' selected ';
    if (numberToDelete > 1) {
      content += 'users?';
    } else {
      content += 'user?';
    }

    return this.confirmDialogService.showConfirmDialog('Remove users', content, 'Delete', 'Cancel');
  }

  /**
   * Update users array
   */
  updateUsers(): void {
    // update users array
    this.users.length = 0;
    this.usersMap.forEach((user: any) => {
      this.users.push(user);
    });

    this.cheListHelper.setList(this.users, 'id');
  }

  /**
   * Ask for loading the users page in asynchronous way
   * @param pageKey {string} - the key of page
   */
  fetchUsersPage(pageKey: string): void {
    this.isLoading = true;
    let promise = this.cheUser.fetchUsersPage(pageKey);

    promise.then(() => {
      this.isLoading = false;
      this.updateUsers();
    }, (error: any) => {
      this.isLoading = false;
      if (error.status === 304) {
        this.updateUsers();
      } else {
        this.cheNotification.showError(error.data && error.data.message ? error.data.message : 'Update information failed.');
      }
    });
  }

  /**
   * Returns true if the next page is exist.
   * @returns {boolean}
   */
  hasNextPage(): boolean {
    return this.pagesInfo.currentPageNumber < this.pagesInfo.countOfPages;
  }

  /**
   * Returns true if the previous page is exist.
   * @returns {boolean}
   */
  hasPreviousPage(): boolean {
    return this.pagesInfo.currentPageNumber > 1;
  }

  /**
   * Returns true if we have more then one page.
   * @returns {boolean}
   */
  isPagination(): boolean {
    return this.pagesInfo.countOfPages > 1;
  }

  /**
   * Add a new user. Show the dialog
   * @param  event {MouseEvent} - the $event
   */
  showAddUserDialog(event: MouseEvent): void {
    this.$mdDialog.show({
      targetEvent: event,
      bindToController: true,
      clickOutsideToClose: true,
      controller: 'AdminsAddUserController',
      controllerAs: 'adminsAddUserController',
      locals: {callbackController: this},
      templateUrl: 'app/admin/user-management/add-user/add-user.html'
    });
  }
}
