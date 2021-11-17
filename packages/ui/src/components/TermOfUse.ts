/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import ContentLogo from 'components/ContentLogo';

import BackNavbar from 'components/BackNavbar';

const TermOfUse: FunctionalComponent = (props: any) => {
  const { goBack } = props;

  return html`
    <div class="main-view" style="flex-direction: column;">
      <div style="">
        <${BackNavbar} url=${goBack} />
        <section class="has-text-centered " style="background-size: cover;">
          <${ContentLogo} logoHeightSmall="true" />
        </section>
    
        <section class="section pb-0 pt-0">
          <h1 class="mese-text mese-14 mese-bold-900"
            style="
                                                                                                                                                                                                        text-transform: uppercase;
                                                                                                                                                                                                        font-style: normal;
                                                                                                                                                                                                      ">
            TERMS & CONDITIONS
          </h1>
    
          <h1 class="mese-text mese-14 mese-bold-900"
            style="
                                                                                                                                                                                                        text-transform: uppercase;
                                                                                                                                                                                                        font-style: normal;
                                                                                                                                                                                                      ">
            MESE.<span class="is-lowercase">io</span> WALLET
          </h1>
    
          <h1 class="mese-text mese-14 mese-bold-900"
            style="
                                                                                                                                                                                                        text-transform: uppercase;
                                                                                                                                                                                                        font-style: normal;
                                                                                                                                                                                                      ">
            LAST MODIFIED JULY 29<sup class="is-lowercase">th</sup>, 2021
          </h1>
    
          <div class="mese-text mese-12 terms">
            <p>
              The International Blockchain Monetary Reserve Ltd. (<b>“IBMR.io,” “we,” “us,”</b> or <b>“our”</b>) is a
              microfinance
              blockchain fintech developer utilizing the Algorand blockchain and other decentralized based technologies. Our
              purpose is to create innovation in the microfinance space through direct open and accessible financial
              inclusion in developing countries and empower users with microassets. IBMR.io is the holding and managing
              entity for ARCC.one and MESE.io as our main microfinance fintech platforms as well as have general
              organizational information found on IBMR.io which including sub-domains for our product offerings (the
              <b>“Sites”</b>), including this Algorand Chrome browser wallet ( <b>“MESE.io Wallet”</b>) which include text,
              images, audio,
              code and other materials or third party information. 
              These Terms of Use (the <b>“Terms,” “Terms of Use”</b> or <b>“Agreement”</b>) contain the terms and conditions
              that govern
              your access to and use of the Site and Services (as defined below) provided by us and is an agreement between
              us and you or the entity you represent (<b>“you”</b> or <b>“your”</b>). Please read these Terms of Use
              carefully before
              using the Site or Services. By using the Site, or clicking a button or checkbox to accept or agree to these
              Terms where that option is made available or, if earlier, using or otherwise accessing the Services (the
              <b>“Effective Date”</b>), you (1) accept and agree to these Terms and any additional terms, rules and
              conditions of
              participation issued by IBMR.io from time to time and (2) consent to the collection, use, disclosure and other
              handling of information as described in our Privacy Policy at the end of these Terms. If you do not agree to
              the Terms, then you may not access or use the Services.
            </p>
    
            <p class="mt-4">
              You represent to us that you are lawfully able to enter into contracts. If you are entering into this
              Agreement for an entity, such as the company you work for, you represent to us that you have legal authority
              to bind that entity. Please see Section 16 for definitions of certain capitalized terms used in this
              Agreement.
            </p>
    
            <p class="mt-4">
              In addition, you represent to us that you and your financial institutions, or any party that owns or controls
              you or your financial institutions, are (1) not subject to sanctions or otherwise designated on any list of
              prohibited or restricted parties, including but not limited to the lists maintained by the United Nations
              Security Council, the U.S. Government (e.g., the Specially Designated Nationals List and Foreign Sanctions
              Evaders List of the U.S. Department of Treasury and the Entity List of the U.S. Department of Commerce), the
              European Union or its Member States, or other applicable government authority and (2) not located in any
              country to which the United States has embargoed goods or has otherwise applied any sanctions.
            </p>
    
            <p class="mt-4">
              <b>1. The Services.</b>
            </p>
            <p>
              1.1 Generally. You may access and use the Services in accordance with this Agreement. You agree to comply
              with
              the terms of this Agreement and all laws, rules and regulations applicable to your use of the Service
              Offerings.
              <br />1.2 Offerings and Access. IBMR.io offers a number of products (each a “Service”) under the MESE.io and
              ARCC.one brand or brands owned by us. These include MESE.io, ARCC.one, ARCC.io and others. Services are
              accessed through the Site, unless otherwise agreed in writing or otherwise offered. Some Services may require
              you to create an Account.
              <br />1.3 Third-Party Content. In certain Services, Third-Party Content may be used by you at your election.
              Third-Party Content is governed by this Agreement and, if applicable, separate terms and conditions
              accompanying such Third-Party Content, which terms and conditions may include separate fees and charges.
              <br />1.4 Third-Party Services. When you use our Services, you may also be using the services of one or more
              third parties. Your use of these third party services may be subject to the separate policies, terms of use,
              and fees of these third parties.
              <br />1.5 Services Information and Limitations
              The Site is a free, client-side interface that allows you to interact directly with the blockchain, while
              remaining in full control of your keys and funds.
              When you access certain features of the Services, you will be able to create a wallet and/or access a wallet
              to perform a variety of transactions. You will receive a key and set up a password, but all funds are on the
              Algorand blockchain itself, and we do not control them. No data leaves your computer or your browser. The
              MESE.io wallet does not collect or hold your keys or information, and the MESE.io wallet cannot access
              accounts; recover keys, passwords, or other information; reset passwords; or reverse transactions. You are
              solely responsible for your use of the Services, including without limitation for storing , backing-up, and
              maintaining the confidentiality of your keys, passwords, and information , and for the security of any
              transactions you perform using the Site. You expressly relieve and release IBMR.io from any and all liability
              and/or loss arising from your use of the Services.
            </p>
    
            <p class="mt-4">
              <b>2. Changes.</b>
            </p>
            <p>
              2.1 To the Services. We may change or discontinue any or all of the Services or change or remove functionality
              of any or all of the Services from time to time. We will notify you of any material change to or
              discontinuation of the Services. For any discontinuation of or material change to a Service, we will use
              commercially reasonable efforts to continue supporting the previous version of the Service for one month after
              the change or discontinuation (except if doing so (a) would pose a security or intellectual property issue,
              (b) is economically or technically burdensome, or (c) would cause us to violate the law or requests of
              governmental entities).
              <br />2.2 To this Agreement. We reserve the right, at our sole discretion, to modify or replace any part of
              this Agreement (including any Policies) at any time. It is your responsibility to check this Agreement
              periodically for changes. Your continued use of or access to the Services following the posting of any changes
              to this Agreement constitutes acceptance of those changes.
            </p>
    
            <p class="mt-4">
              <b>3. Your Responsibilities.</b>
            </p>
            <p>
              3.1 Your Accounts. Except to the extent caused by our breach of this Agreement, (a) you are responsible for
              all activities that occur under your Account, regardless of whether the activities are authorized by you or
              undertaken by you, your employees or a third party (including your contractors, agents or End Users), and (b)
              we and our affiliates are not responsible for unauthorized access to your Account.
              <br />3.2 Your Use. You will ensure that Your Use of the Services does not violate any applicable law. You are
              solely responsible for Your Use of the Services. 
              <br />3.3 Your Security and Backup. You are responsible for properly configuring and using the Services and
              otherwise taking appropriate action to secure, protect and backup your Accounts and Your Content in a manner
              that will provide appropriate security and protection, which might include use of encryption.
              <br />3.4 Log-In Credentials and Account Keys. To the extent we provide you with log-in credentials and API
              authentication generated by the Services, such log-in credentials and API authentication are for your internal
              use only and you will not sell, transfer or sublicense them to any other entity or person, except that you may
              disclose your private key to your agents and subcontractors performing work on your behalf.
            </p>
    
            <p class="mt-4">
              <b>4. Proprietary Rights.</b>
            </p>
            <p>
              4.1 Your Content. Depending on the Service, you may share Content with us. Except as provided in this Section
              4, we obtain no rights under this Agreement from you (or your licensors) to Your Content. You consent to our
              use of Your Content to provide the Services to you.
    
              <br />4.2 Service Offerings License. We or our licensors own all right, title, and interest in and to the
              Services, and all related technology and intellectual property rights. Subject to the terms of this Agreement,
              we grant you a limited, revocable, non-exclusive, non-sublicensable, non-transferable license to do the
              following: (a) access and use the Services solely in accordance with this Agreement; and (b) copy and use Our
              Content solely in connection with your permitted use of the Services. Except as provided in this Section 7.2,
              you obtain no rights under this Agreement from us, our affiliates or our licensors to the Service Offerings,
              including any related intellectual property rights. Some of Our Content and Third-Party Content may be
              provided to you under a separate license, such as the Apache License, Version 2.0, or other open source
              license. In the event of a conflict between this Agreement and any separate license, the separate license will
              prevail with respect to Our Content or Third-Party Content that is the subject of such separate license.
              <br />4.3 License Restrictions. Neither you nor any End User will use the Services in any manner or for any
              purpose other than as expressly permitted by this Agreement. Except as expressly authorized, neither you nor
              any End User will, or will attempt to (a) modify, distribute, alter, tamper with, repair, or otherwise create
              derivative works of any Content included in the Services (except to the extent Content included in the
              Services is provided to you under a separate license that expressly permits the creation of derivative works),
              (b) reverse engineer, disassemble, or decompile the Services or apply any other process or procedure to derive
              the source code of any software included in the Services (except to the extent applicable law doesn’t allow
              this restriction), (c) access or use the Services in a way intended to avoid incurring fees or exceeding usage
              limits or quotas, (d) use scraping techniques to mine or otherwise scrape data except as permitted by a Plan,
              or (e) resell or sublicense the Services unless otherwise agreed in writing. You will not use Our Marks unless
              you obtain our prior written consent. You will not misrepresent or embellish the relationship between us and
              you (including by expressing or implying that we support, sponsor, endorse, or contribute to you or your
              business endeavors). You will not imply any relationship or affiliation between us and you except as expressly
              permitted by this Agreement.
              <br />4.4 Suggestions. If you provide any Suggestions to us or our affiliates, we and our affiliates will be
              entitled to use the Suggestions without restriction. You hereby irrevocably assign to us all right, title, and
              interest in and to the Suggestions and agree to provide us any assistance we require to document, perfect, and
              maintain our rights in the Suggestions.
            </p>
    
            <p class="mt-4">
              <b>5. Disclaimers and Limitations on Liability.</b>
            </p>
            <p>
              YOUR USE OF THE SITE, ITS CONTENT AND ANY SERVICES OFFERED THROUGH THE SITE IS AT YOUR OWN RISK. THE SITE, ITS
              CONTENT AND ANY SERVICES OFFERED THROUGH THE SITE ARE PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS, WITHOUT
              ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. NEITHER IBMR.io NOR ANY PERSON OR ENTITY ASSOCIATED
              WITH IBMR.io MAKES ANY WARRANTY OR REPRESENTATION WITH RESPECT TO THE COMPLETENESS, SECURITY, RELIABILITY,
              QUALITY, ACCURACY OR AVAILABILITY OF THE SITE OR THE SERVICES. WITHOUT LIMITING THE FOREGOING, NEITHER IBMR.io
              NOR ANY PERSON OR ENTITY ASSOCIATED WITH IBMR.io REPRESENTS OR WARRANTS THAT THE SITE, ITS CONTENT OR ANY
              SERVICES OFFERED THROUGH THE SITE WILL BE ACCURATE, RELIABLE, ERROR-FREE OR UNINTERRUPTED, THAT DEFECTS WILL
              BE CORRECTED, THAT THE SITE OR THE SERVER THAT MAKES IT AVAILABLE ARE FREE OF VIRUSES OR OTHER HARMFUL
              COMPONENTS OR THAT THE SITE OR ANY SERVICES OFFERED THROUGH THE SITE WILL OTHERWISE MEET YOUR NEEDS OR
              EXPECTATIONS.
              <br />IBMR.io HEREBY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED STATUTORY OR OTHERWISE,
              INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, NON-INFRINGEMENT AND FITNESS FOR PARTICULAR
              PURPOSE.
              IN NO EVENT WILL IBMR.io, ITS AFFILIATES OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, AGENTS, OFFICERS OR
              DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR
              USE, OR INABILITY TO USE, THE SITE, ANY WEBSITES LINKED TO IT, ANY CONTENT ON THE SITE OR SUCH OTHER WEBSITES,
              OR ANY SERVICES OFFERED THROUGH THE SITE OR SUCH OTHER WEBSITES, INCLUDING ANY DIRECT, INDIRECT, SPECIAL,
              INCIDENTAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO, PERSONAL INJURY, PAIN AND
              SUFFERING, EMOTIONAL DISTRESS, LOSS OF REVENUE, LOSS OF PROFITS, LOSS OF BUSINESS OR ANTICIPATED SAVINGS, LOSS
              OF USE, LOSS OF GOODWILL, LOSS OF DATA, AND WHETHER CAUSED BY TORT (INCLUDING NEGLIGENCE), BREACH OF CONTRACT
              OR OTHERWISE, EVEN IF FORESEEABLE.
              <br />The limitations and disclaimers in this section do not purport to limit liability or alter your rights
              beyond what is permitted by applicable law. IBMR.io's liability shall be limited to the extent permitted by
              law.
              <br />We provide this Site for use only by persons located in the United States. We make no claims that the
              Site or any of its content is accessible or appropriate outside of the United States. Access to the Site may
              not be legal by certain persons or in certain countries. If you access the Site from outside the United
              States, you do so on your own initiative and are responsible for compliance with local laws. Similarly, the
              Site has been translated into a variety of languages. However, IBMR.io can only verify the validity and
              accuracy of the information provided in English and, because of this, the English version of the Site is the
              official text.
            </p>
    
            <p class="mt-4">
              <b>6. Indemnity.</b>
            </p>
            <p>
              You agree to defend, indemnify and hold harmless IBMR.io, its officers, directors, employees and agents from
              and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses
              (including but not limited to attorneys' fees) arising from your use of and access to the Services, or your
              violation of these Terms of Service. This defense and indemnification obligation will survive these Terms of
              Service and your use of the Services.
            </p>
    
            <p class="mt-4">
              <b>7. Arbitration Agreement; Class Waiver; Jury Waiver.</b>
            </p>
            <p>
              PLEASE READ THE FOLLOWING ARBITRATION AGREEMENT CAREFULLY BECAUSE IT REQUIRES YOU AND IBMR.io TO AGREE TO
              RESOLVE ALL DISPUTES THROUGH BINDING INDIVIDUAL ARBITRATION, UNLESS OTHERWISE NOTED.
              <br />7.1 Applicability of Arbitration Agreement. All claims and disputes (excluding claims for injunctive or
              other equitable relief as set forth below) in connection with the Agreement, including the Terms of Service,
              that cannot be resolved informally or in small claims court shall be resolved, to the extent permitted by
              applicable law, by binding arbitration on an individual basis under the terms of this Arbitration Agreement.
              This Arbitration Agreement applies to you and IBMR.io, and to any subsidiaries, affiliates, agents, employees,
              predecessors in interest, successors, and assigns, as well as all authorized or unauthorized users or
              beneficiaries of services or goods provided under the Terms of Service.
              <br />7.2 Notice Requirement and Informal Dispute Resolution. Before either party may seek arbitration, the
              party must first send to the other party a written Notice of Dispute ('Notice') describing the nature and
              basis of the claim or dispute, and the requested relief. A Notice to IBMR.io should be sent to: hello@mese.io
              Attention: Legal. After the Notice is received, you and IBMR.io may attempt to resolve the claim or dispute
              informally. If you and IBMR.io do not resolve the claim or dispute within 60 days after the Notice is
              received, either party may begin an arbitration proceeding. The amount of any settlement offer made by any
              party may not be disclosed to the arbitrator until after the arbitrator has determined the amount of the
              award, if any, to which either party is entitled.
              <br />7.3 Arbitration Rules. Arbitration shall be initiated through the American Arbitration Association
              ('AAA'), an established alternative dispute resolution provider ('ADR Provider') that offers arbitration as
              set forth in this section. If AAA is not available to arbitrate, the parties shall agree to select an
              alternative ADR Provider. The rules of the ADR Provider shall govern all aspects of this arbitration,
              including but not limited to the method of initiating and/or demanding arbitration, except to the extent such
              rules conflict with the Terms of Service. The AAA Consumer Arbitration Rules ('Arbitration Rules') governing
              the arbitration are available online at www.adr.org or by calling the AAA at 1-800-778-7879. The arbitration
              shall be conducted by a single, neutral arbitrator. Any claims or disputes where the total amount of the award
              sought is less than ten thousand U.S. Dollars (US $10,000.00) may be resolved through binding
              non-appearance-based arbitration, at the option of the party seeking relief. For claims or disputes where the
              total amount of the award sought is ten thousand U.S. Dollars (US $10,000.00) or more, the right to a hearing
              will be determined by the Arbitration Rules. Any hearing will be held in the state of Delaware, unless the
              parties agree otherwise. Any judgment on the award rendered by the arbitrator may be entered in any court of
              competent jurisdiction.
              <br />7.4 Additional Rules for Non-Appearance Based Arbitration. If non-appearance arbitration is elected, the
              arbitration shall be conducted by telephone, online, and/or based solely on written submissions; the specific
              manner shall be chosen by the party initiating the arbitration.
              <br />7.5 Authority of Arbitrator. If arbitration is initiated, the arbitrator will decide the rights and
              liabilities, if any, of you and IBMR.io, and the dispute will not be consolidated with any other matters or
              joined with any other cases or parties. The arbitrator shall have the authority to grant motions dispositive
              of all or part of any claim. The arbitrator shall have the authority to award monetary damages and to grant
              any non-monetary remedy or relief available to an individual under applicable law, the AAA Rules, and the
              Terms of Service. The arbitrator shall issue a written award and statement of decision describing the
              essential findings and conclusions on which the award is based, including the calculation of any damages
              awarded. The arbitrator has the same authority to award relief on an individual basis that a judge in a court
              of law would have. The award of the arbitrator is final and binding upon you and IBMR.io.
              <br />7.6 Waiver of Jury Trial. THE PARTIES HEREBY WAIVE THEIR CONSTITUTIONAL AND STATUTORY RIGHTS TO GO TO
              COURT AND HAVE A TRIAL IN FRONT OF A JUDGE OR A JURY, instead electing that all claims and disputes shall be
              resolved by arbitration under this Arbitration Agreement, excluding claims for injunctive or other equitable
              relief as set forth below. Arbitration procedures are typically more limited, more efficient, and less costly
              than court proceedings and are subject to very limited review by a court. If any litigation should arise
              between you and IBMR.io in any state or federal court in a suit to vacate or enforce an arbitration award or
              otherwise, YOU AND IBMR.io WAIVE ALL RIGHTS TO A JURY TRIAL, instead electing that the dispute be resolved by
              a judge.
              <br />7.7 Waiver of Class or Consolidated Actions. ALL CLAIMS AND DISPUTES WITHIN THE SCOPE OF THIS
              ARBITRATION AGREEMENT MUST BE ARBITRATED OR LITIGATED ON AN INDIVIDUAL BASIS AND NOT ON A CLASS BASIS, AND
              CLAIMS OF MORE THAN ONE CUSTOMER OR USER CANNOT BE ARBITRATED OR LITIGATED JOINTLY OR CONSOLIDATED WITH THOSE
              OF ANY OTHER CUSTOMER OR USER.
              <br />7.8 Severability. If any part or parts of this Arbitration Agreement are found under the law to be
              invalid or unenforceable by a court of competent jurisdiction, then such specific part or parts shall be of no
              force and effect and shall be severed, and the remainder of the Arbitration Agreement shall continue in full
              force and effect.
              <br />7.9 Right to Waive. Any or all of the rights and limitations set forth in this Arbitration Agreement may
              be waived by the party against whom the claim is asserted. Such waiver shall not waive or affect any other
              portion of this Arbitration Agreement.
              <br />7.10 Survival of Agreement. This Arbitration Agreement will survive the termination of your relationship
              with IBMR.io.
              <br />7.11 Small Claims Court. Notwithstanding the foregoing, either you or IBMR.io may bring an individual
              action in small claims court.
              <br />7.12 Equitable Relief. Notwithstanding the foregoing, either party may seek equitable relief before a
              court of competent jurisdiction for the alleged unlawful use of copyrights, trademarks, trade names, logos,
              trade secrets, or patents or emergency equitable relief before a court of competent jurisdiction to maintain
              the status quo pending arbitration. A request for interim measures shall not be deemed a waiver of any other
              rights or obligations under this Arbitration Agreement.
            </p>
    
            <p class="mt-4">
              <b>8. Governing Law, Venue, and Jurisdiction.</b>
            </p>
            <p>
              To the extent the parties are permitted under these Terms of Service to initiate litigation in court, both you
              and IBMR.io agree that all claims and disputes, including statutory claims and disputes, arising out of or
              relating to the Agreement, including the Terms of Service, shall be governed in all respects by the
              substantive law of The Bahamas, without regard to its conflict of law principles. You and IBMR.io hereby
              consent to submit to the jurisdiction of the federal and state courts sitting in Nassau, The Bahamas for any
              actions, suits, or proceedings arising out of or relating to the Agreement, including the Terms of Service,
              that are not subject to the Arbitration Agreement.
              <br />YOU AND IBMR.io AGREE THAT ANY CAUSE OF ACTION ARISING OUT OF OR RELATED TO THE SERVICES MUST COMMENCE
              WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES. OTHERWISE, SUCH CAUSE OF ACTION IS PERMANENTLY BARRED
              TO THE EXTENT PERMITTED BY LAW.
            </p>
    
            <p class="mt-4">
              <b>9. Entire Agreement.</b>
            </p>
            <p>
              The Terms of Service, Privacy Policy, any other legal notices published by IBMR.io on the Site shall
              constitute the entire agreement between you and IBMR.io concerning the Services. If any provision of these
              Terms of Service is deemed invalid by a court of competent jurisdiction, the invalidity of such provision
              shall not affect the validity of the remaining provisions of these Terms of Service, which shall remain in
              full force and effect. No waiver of any term of these Terms of Service shall be deemed a further or continuing
              waiver of such term or any other term, and IBMR.io 's failure to assert any right or provision under these
              Terms of Service shall not constitute a waiver of such right or provision.
            </p>
    
            <p class="mt-4">
              <b>10. Miscellaneous.</b>
            </p>
            <p>
              10.1 Assignment. You will not assign or otherwise transfer this Agreement or any of your rights and
              obligations under this Agreement, without our prior written consent. Any assignment or transfer in violation
              of this Section 12.1 will be void. We may assign this Agreement without your consent (a) in connection with a
              merger, acquisition or sale of all or substantially all of our assets, or (b) to any Affiliate or as part of a
              corporate reorganization; and effective upon such assignment, the assignee is deemed substituted for us as a
              party to this Agreement and we are fully released from all of our obligations and duties to perform under this
              Agreement. Subject to the foregoing, this Agreement will be binding upon, and inure to the benefit of the
              parties and their respective permitted successors and assigns.
              <br />10.2 Entire Agreement and Modifications. This Agreement incorporates the Policies by reference and is
              the entire agreement between you and us regarding the subject matter of this Agreement. If the terms of this
              document are inconsistent with the terms contained in any Policy, the terms contained in this document will
              control. Any modification to the terms of this Agreement may only be made in writing.
              <br />10.3 Force Majeure. Neither party nor their respective affiliates will be liable for any delay or
              failure to perform any obligation under this Agreement where the delay or failure results from any cause
              beyond such party’s reasonable control, including but not limited to acts of God, utilities or other
              telecommunications failures, cyber attacks, earthquake, storms or other elements of nature, pandemics,
              blockages, embargoes, riots, acts or orders of government, acts of terrorism, or war.
              <br />10.4 Export and Sanctions Compliance. In connection with this Agreement, you will comply with all
              applicable import, re-import, sanctions, anti-boycott, export, and re-export control laws and regulations,
              including all such laws and regulations that may apply. For clarity, you are solely responsible for compliance
              related to the manner in which you choose to use the Services. You may not use any Service if you are the
              subject of U.S. sanctions or of sanctions consistent with U.S. law imposed by the governments of the country
              where you are using the Service. 
              <br />10.5 Independent Contractors; Non-Exclusive Rights. We and you are independent contractors, and this
              Agreement will not be construed to create a partnership, joint venture, agency, or employment relationship.
              Neither party, nor any of their respective affiliates, is an agent of the other for any purpose or has the
              authority to bind the other. Both parties reserve the right (a) to develop or have developed for it products,
              services, concepts, systems, or techniques that are similar to or compete with the products, services,
              concepts, systems, or techniques developed or contemplated by the other party, and (b) to assist third party
              developers or systems integrators who may offer products or services which compete with the other party’s
              products or services.
              <br />10.6 Eligibility. If you are under the age of majority in your jurisdiction of residence, you may use
              the Site or Services only with the consent of or under the supervision of your parent or legal guardian.
              <br />NOTICE TO PARENTS AND GUARDIANS: By granting your minor permission to access the Site or Services, you
              agree to these Terms of Use on behalf of your minor. You are responsible for exercising supervision over your
              minor’s online activities. If you do not agree to these Terms of Use, do not let your minor use the Site or
              Services.
              <br />10.7 Language. All communications and notices made or given pursuant to this Agreement must be in the
              English language. If we provide a translation of the English language version of this Agreement, the English
              language version of the Agreement will control if there is any conflict
              <br />10.8 User Notice.
              <br />(a) To You. We may provide any notice to you under this Agreement by posting a notice on the product
              sites.
              <br />10.9 No Third-Party Beneficiaries. Except as otherwise set forth herein, this Agreement does not create
              any third-party beneficiary rights in any individual or entity that is not a party to this Agreement.
              <br />10.10 No Waivers. The failure by us to enforce any provision of this Agreement will not constitute a
              present or future waiver of such provision nor limit our right to enforce such provision at a later time. All
              waivers by us must be in writing to be effective.
    
            </p>
    
            <p class="mt-4">
              <b>Contact information</b>
              <br />We welcome your comments or questions about these Terms of Service. You may contact us hello@mese.io
            </p>
    
            <h1 class="mese-14 mese-bold-900 is-uppercase mt-4 has-text-centered">
              Privacy Policy
            </h1>
            <h1 class="mese-14 mese-bold-900 has-text-centered">
              LAST MODIFIED JULY 29th, 2021
            </h1>
    
            <p class="mt-4">
              <b>Introduction</b>
              <br />We do not collect data passively, do not monetize the collection of data, and do not use your data for
              marketing or advertising.
              To the extent we collect any personal information, this privacy policy ('Policy') describes how IBMR.io
              collects, uses, and shares personal information of people who visit our website (the 'Site') or otherwise use
              our services (collectively, the 'Services').
              This Policy applies to anyone who accesses the Services. Please read the Policy carefully to understand our
              practices regarding your information and how we will treat it. By visiting the Site and/or using the Services,
              you acknowledge that the collection, use, and sharing of your information will take place as described in this
              Policy.
              So that we are clear about the terminology we are using, when we use the phrase 'Personal Information' in this
              Privacy Policy, we mean information about an individual that (either by itself or when combined with
              information from other available sources) allows that individual to be identified, including, the individual's
              name, telephone number, or e-mail address.
            </p>
    
            <p class="mt-4">
              <b>The Blockchain</b>
              <br />Due to the inherent transparency of blockchains, including the Algorand Blockchain, transactions that
              individuals broadcast via IBMR.io and our related sites, MESE.io, ARCC.one and ARCC.io may be publicly
              accessible. This includes, but is not limited to, your public sending address, the public address of the
              receiver, the amount sent or received, and any other data a user has chosen to include in a given transaction.
              Information stored on a blockchain may be public, immutable, and difficult or even impossible to remove or
              delete. Transactions and addresses may reveal information about the user’s identity and information can
              potentially be correlated now or in the future by any party who chooses to do so, including law enforcement.
              Users are encouraged to review how privacy and transparency on the blockchain works.
            </p>
    
            <p class="mt-4">
              <b>What We Collect</b>
              <br />We collect information about you as described below. We use this information to enhance your experience
              with our Services.
            </p>
    
            <p class="mt-4">
              <b>Information You Provide</b>
              <br />We collect information about you as described below. We use this information to enhance your experience
              with our Services.
            </p>
    
            <p class="mt-4">
              <b>What We Collect</b>
              <br />We may collect Personal Information you choose to provide to us. For example, when you contact us for
              support through the Services, you give us with your e-mail address and any other information that you choose
              to provide. Also, if you participate in a IBMR.io offer, give-away, or promotion ('Promotion'), you provide
              your name, e-mail address, and mailing address.
            </p>
    
            <p class="mt-4">
              <b>Use Of Information</b>
              <br />We use the information that we have about you to provide support and certain Services to you.
              We may use the Personal Information we collect from and about you to (1) provide you with information or
              services that you request from us, including to respond to your comments, questions, and/or provide customer
              service; (2) monitor and analyze usage and trends and personalize and improve the Services and your experience
              using the Services; and (3) for any other purpose with your consent.
              IBMR.io does not track users over time and across third party websites to provide targeted advertising and
              therefore does not respond to Do Not Track (DNT) signals.
            </p>
    
            <p class="mt-4">
              <b>Sharing Of Personal Information</b>
              <br />We will not disclose your Personal Information other than as described below, and we do not and will not
              sell your Personal Information to anyone.
              We may share the Personal Information we collect from and about you (1) to fulfill the purpose for which you
              provided it; (2) with your consent; (3) for legal, protection, and safety purposes; (4) to comply with any
              court order, law, or legal process, including to respond to any government or regulatory request; (5) to
              protect the rights of IBMR.io, our agents, customers, and others, including by enforcing our agreements,
              policies, and terms of service; and (6) with those who need it to do work for us (our Service Providers, as
              defined below).
            </p>
    
            <p class="mt-4">
              <b>Service providers</b>
              <br />We may contract with third parties to perform functions related to the Services ('Service Providers').
              In general, Service Providers will have access to your Personal Information only to the extent needed to
              perform their business functions but may not use or share that personal information for purposes outside the
              scope of their functions related to the Services.
            </p>
    
            <p class="mt-4">
              <b>Links To Other Sites</b>
              <br />The Site may contain links and/or access to third-party websites, applications, and/or Application
              Programming Interfaces ('APIs') that are not owned or controlled by IBMR.io. Once you click on such a link and
              leave the Site or are redirected to a third-party website or application, you are no longer governed by this
              Policy. Any information you provide on those sites or applications is subject to that third party’s privacy
              policy and we are not responsible for the privacy and security practices and policies of those third-party
              sites or applications.
            </p>
    
            <p class="mt-4">
              <b>Legal Basis for Processing</b>
              <br />The following legal bases apply to the ways in which we use and share an individual's Personal
              Information:
              <br />1. We rely on an individual's consent to process Personal Information to provide support and/or carry
              out
              Promotions. This consent can be withdrawn at any time.
              <br />2. We also process the information provided by an individual in our legitimate interests in ensuring our
              business is conducted legitimately and to a high standard.
    
            </p>
    
            <p class="mt-4">
              <b>Contact information</b>
              <br />We welcome your comments or questions about this Policy. You may contact us at:  hello@mese.io
            </p>
    
            <p class="mt-4">
              <b>Changes To Privacy Policy</b>
              <br />We may modify this Policy from time to time. If we make any changes, we will change the Last Modified
              date above. We also may provide additional notice, as applicable, depending on the type of change. If you
              object to any changes, you may stop using the Services. Your continued use of the Services after we publish or
              otherwise provide notice about our changes to the Policy means that you are consenting to the updated Policy.
    
            </p>
          </div>
        </section>
      </div>
    </div>
  `;
};

export default TermOfUse;
