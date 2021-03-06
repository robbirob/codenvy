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

interface ICodenvyInviteResource<T> extends ng.resource.IResourceClass<T> {
  invite: any;
  getInvited: any;
  delete: any;
}

/**
 * This class is handling the invitation API.
 *
 * @author Ann Shumilova
 */
export class CodenvyInvite {
  /**
   * Angular promise service.
   */
  private $q: ng.IQService;

  /**
   * Angular Resource service.
   */
  private $resource: ng.resource.IResourceService;
  /**
   * Team invitations with team's id as a key.
   */
  private teamInvitations: Map<string, any>;
  /**
   * Client to make remote invitation API calls.
   */
  private remoteInviteAPI: ng.resource.IResourceClass<ng.resource.IResource<any>>;

  /**
   * Default constructor that is using resource
   * @ngInject for Dependency injection
   */
  constructor($q: ng.IQService, $resource: ng.resource.IResourceService) {
    this.$q = $q;
    this.$resource = $resource;

    this.teamInvitations = new Map();

    this.remoteInviteAPI = <ICodenvyInviteResource<any>>this.$resource('/api/invite', {}, {
      invite: {method: 'POST', url: '/api/invite'},
      getInvited: {method: 'GET', url: '/api/invite/:domain?instance=:instance', isArray: true},
      remove: {method: 'DELETE', url: '/api/invite/:domain?instance=:instance&email=:email'}
    });
  }

  /**
   * Invite non existing user to the team.
   *
   * @param teamId id of the team to invite to
   * @param email user's email to send invite
   * @param actions actions to be granted
   * @returns {any|angular.IPromise<IResourceArray<T>>|angular.IPromise<Array<T>>|angular.IPromise<T>}
   */
  inviteToTeam(teamId: string, email: string, actions: Array<string>): ng.IPromise<any> {
    let promise = this.remoteInviteAPI.invite({domainId: 'organization', instanceId: teamId, email: email, actions: actions}).$promise;
    return promise;
  }

  /**
   * Fetches the list of team invitations.
   *
   * @param teamId id of the team to fetch invites
   * @returns {any|angular.IPromise<IResourceArray<T>>|angular.IPromise<Array<T>>|angular.IPromise<T>}
   */
  fetchTeamInvitations(teamId: string): ng.IPromise<any> {
    let deferred = this.$q.defer();
    let promise = this.remoteInviteAPI.getInvited({domain: 'organization', instance: teamId}).$promise;
    promise.then((data: any) => {
      this.teamInvitations.set(teamId, data);
      deferred.resolve(data);
    }, (error: any) => {
      if (error.status === 304) {
        deferred.resolve(this.teamInvitations.get(teamId));
      } else {
        deferred.reject(error);
      }
    });
    return deferred.promise;
  }

  /**
   * Returns team's invitations by team's id.
   *
   * @param teamId id of the team
   * @returns {any} invitations list
   */
  getTeamInvitations(teamId: string): Array<any> {
    return this.teamInvitations.get(teamId);
  }

  /**
   * Deletes team invitation team's id and user's email.
   *
   * @param teamId id of the team
   * @param email user email to delete invitation
   * @returns {angular.IPromise<any>}
   */
  deleteTeamInvitation(teamId: string, email: string) {
    return this.remoteInviteAPI.remove({domain: 'organization', instance: teamId, email: email}).$promise;
  }
}
