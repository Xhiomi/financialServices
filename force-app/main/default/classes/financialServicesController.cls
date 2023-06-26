public with sharing class financialServicesController {
    final static String INDUSTRY = 'Financial Services';

    //A lightning component should display a list of Account records which meets the following criteria: Industry ="Financial Services"
    @AuraEnabled(cacheable = true)
    public static List<Account> getAccounts() {
        return [SELECT Id, Name, Owner.Name, Phone, Website, AnnualRevenue
                FROM Account
                WHERE Industry =: INDUSTRY
        ];
    }
}