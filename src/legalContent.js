import { SUPPORT_EMAIL } from './config.js';

// Draft texts written for Marsa's real behaviour. Have a lawyer review them before publishing.
export const LEGAL_UPDATED = 'أكتوبر 2026';
export const LEGAL_UPDATED_I18N = { ar: LEGAL_UPDATED, fr: 'octobre 2026', en: 'October 2026' };

export const LEGAL = {
  privacy: {
    title: 'سياسة الخصوصية',
    sections: [
      ['من نحن', ['«مرسى» تطبيق جزائري لإعلانات بيع القوارب والمحركات، ودليل للأنشطة البحرية وأنشطة الصيد. تشرح هذه السياسة ما نجمعه من بيانات وكيف نستعملها وكيف تتحكم بها.']],
      ['البيانات التي نجمعها', [
        'بيانات الحساب: البريد الإلكتروني (للدخول والتحقق)، وكلمة السر (تُحفظ مشفّرة لدى مزوّد المصادقة ولا نطّلع عليها)، والاسم.',
        'بيانات اختيارية: رقم الهاتف والولاية.',
        'ما تنشره: نصوص الإعلانات والأنشطة، والصور التي تختارها أنت، وأرقام الهاتف وواتساب التي تضعها للتواصل.',
        'الموقع الجغرافي: فقط عندما تضغط زر «حدّد موقع نشاطك» أثناء تسجيل نشاط في الدليل. نحفظ الإحداثيات مع نشاطك لعرضها على الخريطة. لا نتتبع موقعك في الخلفية.',
        'نشاطك داخل التطبيق: الإعلانات المفضلة، والبلاغات التي ترسلها، واهتمامات الإشعارات التي تختارها.',
        'معرّف الإشعارات: إذا فعّلت الإشعارات نحفظ معرّف جهازك لإرسال تنبيهات الإعلانات الجديدة فقط، ويُحذف عند تسجيل الخروج أو حذف الحساب.',
        'بيانات تقنية: عنوان IP وسجلات تقنية لدى مزوّدي الخدمة، لأغراض الأمان وحل الأعطال.',
      ]],
      ['ما لا نفعله', [
        'لا نستعمل أدوات تحليلات سلوكية ولا إعلانات، ولا نجمع معرّف الإعلانات.',
        'لا نصل إلى جهات اتصالك أو رسائلك أو مكتبة صورك. نرفع فقط الصور التي تختارها بنفسك.',
        'لا نبيع بياناتك.',
      ]],
      ['كيف نستعمل بياناتك', ['لتشغيل حسابك، وعرض إعلاناتك وأنشطتك، وتمكين المسجّلين من التواصل معك، وإرسال رمز التحقق إلى بريدك، ومنع الاحتيال والإساءة، والرد على استفساراتك.']],
      ['من يرى بياناتك', [
        'يراها الجميع (حتى الزوار): عنوان الإعلان ووصفه وصوره وسعره والولاية، واسم البائع المعروض، واسم النشاط ووصفه وصوره وموقعه إن حدّدته.',
        'يراها المستخدمون المسجّلون فقط: رقم الهاتف ورقم واتساب الخاصان بالإعلان أو النشاط.',
        'لا يراها أحد غيرك: بريدك الإلكتروني وكلمة سرك ومفضلتك.',
        'قد يطّلع فريق الإدارة على البلاغات وعلى ملفات الأنشطة لمراجعتها.',
      ]],
      ['مزوّدو الخدمة', ['نستعين بمزوّدين يعالجون البيانات نيابةً عنا لتشغيل التطبيق: Supabase (قاعدة البيانات والمصادقة وتخزين الصور)، وCloudflare (استضافة الموقع)، وGoogle Firebase (إرسال الإشعارات)، وخدمة إرسال البريد الإلكتروني لرمز التحقق. قد تقع خوادمهم خارج الجزائر.']],
      ['الأمان', ['نستعمل اتصالًا مشفّرًا (HTTPS)، وقواعد وصول صارمة في قاعدة البيانات تمنع كل مستخدم من الاطلاع على بيانات غيره خارج ما هو معروض علنًا. ومع ذلك لا توجد طريقة آمنة بنسبة 100%.']],
      ['الاحتفاظ والحذف', [
        'نحتفظ ببياناتك ما دام حسابك قائمًا.',
        'يمكنك حذف حسابك نهائيًا من التطبيق: «حسابي ← حذف حسابي نهائيًا». يُحذف حسابك وإعلاناتك وأنشطتك وصورك وبيانات التواصل والمفضلة.',
        'يمكنك طلب الحذف أيضًا من الصفحة العامة: marsadz.app/delete-account',
        'قد تبقى نسخ احتياطية مشفّرة لدى مزوّد الخدمة لمدة محدودة ثم تُحذف تلقائيًا.',
      ]],
      ['حقوقك', ['لك الحق في الاطلاع على بياناتك وتصحيحها وحذفها والاعتراض على معالجتها، وفق القانون الجزائري المتعلق بحماية المعطيات ذات الطابع الشخصي. تعدّل بياناتك من «حسابي» أو تراسلنا.']],
      ['الأطفال', ['التطبيق غير موجّه لمن هم دون 18 عامًا، ولا نجمع عمدًا بيانات أطفال.']],
      ['التغييرات', ['قد نحدّث هذه السياسة، وسنغيّر تاريخ آخر تحديث أعلاه.']],
      ['التواصل', [`لأي استفسار عن الخصوصية: ${SUPPORT_EMAIL}`]],
    ],
  },

  terms: {
    title: 'شروط الاستخدام',
    sections: [
      ['عن مرسى', ['مرسى منصة لعرض الإعلانات والتعريف بالأنشطة. نحن وسيط للعرض فقط ولسنا طرفًا في أي عملية بيع، ولا نضمن صحة الإعلانات أو جودة ما يُعرض.']],
      ['الحساب', ['يجب أن يكون عمرك 18 عامًا فأكثر، وأن تقدّم بيانات صحيحة، وأن تحافظ على سرّية كلمة سرك وتتحمل ما يجري عبر حسابك.']],
      ['المحتوى المحظور', [
        'الإعلانات الكاذبة أو المضلّلة، أو بيع ما لا تملكه.',
        'المواد والأشياء الممنوعة قانونًا في الجزائر.',
        'المحتوى المسيء أو المنتحل لشخصية أو نشاط آخر.',
        'الإعلانات المكرّرة والمزعجة (السبام)، ونشر بيانات الغير دون إذنهم.',
      ]],
      ['حدود الإعلانات', ['لكل حساب عدد محدود من الإعلانات النشطة في الوقت نفسه، ولكل إعلان مدة ظهور محددة يمكن تجديدها.']],
      ['الأنشطة المسجّلة في الدليل', ['تخضع الأنشطة لمراجعة الإدارة وموافقتها قبل الظهور، ويمكن إيقافها إذا خالفت الشروط.']],
      ['الإبلاغ والإشراف', ['إذا رأيت إعلانًا أو نشاطًا مخالفًا فاستعمل زر «الإبلاغ». نراجع البلاغات، ويحق لنا إخفاء أو حذف أي محتوى مخالف وإيقاف الحسابات المخالفة دون إشعار مسبق.']],
      ['المسؤولية والأمان', [
        'التفاوض والدفع والتسليم تتم بينك وبين الطرف الآخر مباشرة وخارج التطبيق.',
        'عاين القارب أو المحرك بنفسك، وتحقق من أوراق الملكية، ولا تدفع مقدّمًا لشخص لا تعرفه.',
        'لا نتحمل مسؤولية الخسائر الناتجة عن التعامل بين المستخدمين، بالقدر الذي يسمح به القانون.',
      ]],
      ['حذف الحساب', ['يمكنك حذف حسابك في أي وقت من «حسابي».']],
      ['القانون المطبّق', ['تخضع هذه الشروط للقانون الجزائري.']],
      ['التعديلات', ['يحق لنا تعديل هذه الشروط، واستمرارك في الاستعمال بعد التعديل يعني موافقتك على النسخة المحدّثة.']],
      ['التواصل', [SUPPORT_EMAIL]],
    ],
  },

  delete: {
    title: 'حذف الحساب والبيانات',
    sections: [
      ['من داخل التطبيق (الأسرع)', [
        'افتح التطبيق وسجّل الدخول.',
        'اذهب إلى «حسابي» ثم اضغط «حذف حسابي نهائيًا».',
        'اكتب كلمة «حذف» للتأكيد ثم اضغط «تأكيد الحذف».',
      ]],
      ['عن طريق البريد الإلكتروني', [
        `أرسل طلبًا إلى ${SUPPORT_EMAIL} من البريد المسجّل في حسابك، واكتب في العنوان: «طلب حذف حساب».`,
        'نعالج الطلب خلال 30 يومًا كحد أقصى.',
      ]],
      ['ما الذي يُحذف', ['حسابك، وبيانات ملفك (الاسم والهاتف والولاية)، وكل إعلاناتك وأنشطتك المسجّلة، وصورها، وأرقام التواصل المرتبطة بها، ومفضلتك.']],
      ['ما الذي قد يبقى', [
        'نسخ احتياطية مشفّرة لدى مزوّد الخدمة لمدة محدودة، ثم تُحذف تلقائيًا.',
        'البلاغات التي أرسلتها تُحذف مع حسابك.',
      ]],
    ],
  },
};

// French and English versions shown inside the app (the public HTML pages stay Arabic, see scripts/gen-legal.mjs)
const LEGAL_FR = {
  privacy: {
    title: 'Politique de confidentialité',
    sections: [
      ['Qui sommes-nous', ['« Marsa » est une application algérienne d’annonces de vente de bateaux et de moteurs, et un annuaire des activités maritimes et de pêche. Cette politique explique quelles données nous collectons, comment nous les utilisons et comment vous les contrôlez.']],
      ['Données collectées', [
        'Données du compte : l’adresse e-mail (connexion et vérification), le mot de passe (stocké chiffré chez le fournisseur d’authentification, nous n’y avons pas accès) et le nom.',
        'Données facultatives : numéro de téléphone et wilaya.',
        'Ce que vous publiez : textes des annonces et des activités, photos et vidéos que vous choisissez, numéros de téléphone et WhatsApp indiqués pour être contacté.',
        'Localisation : uniquement lorsque vous appuyez sur « Localiser mon activité » lors de l’inscription d’une activité dans l’annuaire. Les coordonnées sont enregistrées avec votre activité pour l’afficher sur la carte. Aucun suivi en arrière-plan.',
        'Votre activité dans l’application : annonces favorites, signalements envoyés et centres d’intérêt choisis pour les notifications.',
        'Identifiant de notification : si vous activez les notifications, nous enregistrons l’identifiant de votre appareil uniquement pour envoyer les alertes de nouvelles annonces ; il est supprimé à la déconnexion ou à la suppression du compte.',
        'Données techniques : adresse IP et journaux techniques chez nos prestataires, à des fins de sécurité et de résolution de pannes.',
      ]],
      ['Ce que nous ne faisons pas', [
        'Nous n’utilisons ni outils d’analyse comportementale ni publicité, et ne collectons pas l’identifiant publicitaire.',
        'Nous n’accédons ni à vos contacts, ni à vos messages, ni à votre galerie. Seules les photos que vous choisissez sont envoyées.',
        'Nous ne vendons pas vos données.',
      ]],
      ['Utilisation de vos données', ['Faire fonctionner votre compte, afficher vos annonces et activités, permettre aux utilisateurs inscrits de vous contacter, envoyer le code de vérification, vous notifier des nouveautés qui vous intéressent, prévenir la fraude et les abus, et répondre à vos demandes.']],
      ['Qui voit vos données', [
        'Visible par tous (même les visiteurs) : titre, description, photos, prix et wilaya de l’annonce, nom du vendeur affiché, nom, description, photos et localisation de l’activité si vous l’avez indiquée.',
        'Visible par les utilisateurs inscrits uniquement : numéros de téléphone et WhatsApp de l’annonce ou de l’activité.',
        'Visible par vous seul : votre e-mail, votre mot de passe, vos favoris et vos notifications.',
        'L’équipe d’administration peut consulter les signalements et les dossiers d’activités pour les examiner.',
      ]],
      ['Prestataires', ['Nous faisons appel à des prestataires qui traitent les données pour notre compte : Supabase (base de données, authentification et stockage), Cloudflare (hébergement du site), Google Firebase (envoi des notifications) et un service d’envoi d’e-mails pour le code de vérification. Leurs serveurs peuvent se trouver hors d’Algérie.']],
      ['Sécurité', ['Connexion chiffrée (HTTPS) et règles d’accès strictes dans la base de données empêchant chaque utilisateur de consulter les données d’autrui au-delà de ce qui est public. Aucune méthode n’est toutefois sûre à 100 %.']],
      ['Conservation et suppression', [
        'Nous conservons vos données tant que votre compte existe.',
        'Vous pouvez supprimer définitivement votre compte depuis l’application : « Mon compte ← Supprimer mon compte définitivement ». Votre compte, vos annonces, activités, photos, coordonnées et favoris sont supprimés.',
        'Vous pouvez aussi demander la suppression depuis la page publique : marsadz.app/delete-account',
        'Des sauvegardes chiffrées peuvent subsister chez le prestataire pendant une durée limitée, puis sont supprimées automatiquement.',
      ]],
      ['Vos droits', ['Vous pouvez accéder à vos données, les rectifier, les supprimer et vous opposer à leur traitement, conformément à la loi algérienne relative à la protection des données à caractère personnel. Modifiez vos données depuis « Mon compte » ou écrivez-nous.']],
      ['Mineurs', ['L’application ne s’adresse pas aux moins de 18 ans et nous ne collectons pas sciemment de données d’enfants.']],
      ['Modifications', ['Nous pouvons mettre à jour cette politique ; la date de dernière mise à jour ci-dessus sera modifiée.']],
      ['Contact', [`Pour toute question sur la confidentialité : ${SUPPORT_EMAIL}`]],
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    sections: [
      ['À propos de Marsa', ['Marsa est une plateforme de diffusion d’annonces et de présentation d’activités. Nous sommes un simple intermédiaire d’affichage, nous ne sommes partie à aucune vente et ne garantissons ni l’exactitude des annonces ni la qualité de ce qui est proposé.']],
      ['Compte', ['Vous devez avoir 18 ans ou plus, fournir des informations exactes, garder votre mot de passe secret et assumer ce qui est fait depuis votre compte.']],
      ['Contenus interdits', [
        'Annonces fausses ou trompeuses, ou vente de ce que vous ne possédez pas.',
        'Articles et produits interdits par la loi algérienne.',
        'Contenus offensants ou usurpant l’identité d’une personne ou d’une activité.',
        'Annonces répétées et indésirables (spam) et publication des données d’autrui sans autorisation.',
      ]],
      ['Limites des annonces', ['Chaque compte dispose d’un nombre limité d’annonces actives simultanément, et chaque annonce a une durée d’affichage renouvelable.']],
      ['Activités de l’annuaire', ['Les activités sont examinées et validées par l’administration avant leur publication et peuvent être suspendues en cas de non-respect des conditions.']],
      ['Signalement et modération', ['Si vous voyez une annonce ou une activité non conforme, utilisez le bouton « Signaler ». Nous examinons les signalements et pouvons masquer ou supprimer tout contenu non conforme et suspendre les comptes concernés sans préavis.']],
      ['Responsabilité et sécurité', [
        'Négociation, paiement et livraison se font directement entre vous et l’autre partie, en dehors de l’application.',
        'Inspectez vous-même le bateau ou le moteur, vérifiez les papiers de propriété et ne payez jamais d’avance une personne inconnue.',
        'Nous ne sommes pas responsables des pertes résultant des échanges entre utilisateurs, dans la mesure permise par la loi.',
      ]],
      ['Suppression du compte', ['Vous pouvez supprimer votre compte à tout moment depuis « Mon compte ».']],
      ['Droit applicable', ['Les présentes conditions sont soumises au droit algérien.']],
      ['Modifications', ['Nous pouvons modifier ces conditions ; continuer à utiliser l’application après une modification vaut acceptation de la nouvelle version.']],
      ['Contact', [SUPPORT_EMAIL]],
    ],
  },
  delete: {
    title: 'Suppression du compte et des données',
    sections: [
      ['Depuis l’application (le plus rapide)', [
        'Ouvrez l’application et connectez-vous.',
        'Allez dans « Mon compte » puis appuyez sur « Supprimer mon compte définitivement ».',
        'Tapez le mot « supprimer » pour confirmer puis appuyez sur « Confirmer la suppression ».',
      ]],
      ['Par e-mail', [
        `Envoyez une demande à ${SUPPORT_EMAIL} depuis l’adresse enregistrée sur votre compte, avec pour objet : « Demande de suppression de compte ».`,
        'Nous traitons la demande sous 30 jours au maximum.',
      ]],
      ['Ce qui est supprimé', ['Votre compte, les données de votre profil (nom, téléphone, wilaya), toutes vos annonces et activités, leurs photos et vidéos, les coordonnées associées, vos favoris et vos notifications.']],
      ['Ce qui peut subsister', [
        'Des sauvegardes chiffrées chez le prestataire pendant une durée limitée, puis supprimées automatiquement.',
        'Les signalements que vous avez envoyés sont supprimés avec votre compte.',
      ]],
    ],
  },
};

const LEGAL_EN = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['Who we are', ['“Marsa” is an Algerian app for boat and engine sale listings, and a directory of maritime and fishing businesses. This policy explains what data we collect, how we use it and how you control it.']],
      ['Data we collect', [
        'Account data: your email address (sign-in and verification), your password (stored encrypted by the authentication provider; we never see it) and your name.',
        'Optional data: phone number and wilaya.',
        'What you publish: listing and business texts, the photos and videos you choose, and the phone and WhatsApp numbers you add for contact.',
        'Location: only when you tap “Locate my business” while registering a business in the directory. We store the coordinates with your business to show it on the map. We never track your location in the background.',
        'Your activity in the app: favourite listings, reports you send and the notification interests you choose.',
        'Notification identifier: if you turn on notifications, we store your device identifier only to send alerts about new listings; it is deleted when you sign out or delete your account.',
        'Technical data: IP address and technical logs kept by our service providers, for security and troubleshooting.',
      ]],
      ['What we do not do', [
        'We use no behavioural analytics or advertising tools and do not collect the advertising ID.',
        'We do not access your contacts, messages or photo library. We only upload the photos you pick yourself.',
        'We do not sell your data.',
      ]],
      ['How we use your data', ['To run your account, show your listings and businesses, let signed-in users contact you, send the verification code to your email, notify you about new items that match your interests, prevent fraud and abuse, and answer your questions.']],
      ['Who sees your data', [
        'Everyone (including visitors): the listing title, description, photos, price and wilaya, the displayed seller name, and the business name, description, photos and location if you set it.',
        'Signed-in users only: the phone and WhatsApp numbers of the listing or business.',
        'Only you: your email, password, favourites and notifications.',
        'The admin team may review reports and business files.',
      ]],
      ['Service providers', ['We rely on providers that process data on our behalf to run the app: Supabase (database, authentication and file storage), Cloudflare (website hosting), Google Firebase (push notifications) and an email service for verification codes. Their servers may be located outside Algeria.']],
      ['Security', ['We use encrypted connections (HTTPS) and strict access rules in the database so no user can see other users’ data beyond what is public. No method is 100% secure, however.']],
      ['Retention and deletion', [
        'We keep your data as long as your account exists.',
        'You can permanently delete your account in the app: “My account → Delete my account permanently”. Your account, listings, businesses, photos, contact details and favourites are deleted.',
        'You can also request deletion from the public page: marsadz.app/delete-account',
        'Encrypted backups may remain with the provider for a limited time and are then deleted automatically.',
      ]],
      ['Your rights', ['You have the right to access, correct and delete your data and to object to its processing, under the Algerian law on the protection of personal data. Edit your data from “My account” or write to us.']],
      ['Children', ['The app is not intended for people under 18 and we do not knowingly collect children’s data.']],
      ['Changes', ['We may update this policy and will change the “last updated” date above.']],
      ['Contact', [`For any privacy question: ${SUPPORT_EMAIL}`]],
    ],
  },
  terms: {
    title: 'Terms of use',
    sections: [
      ['About Marsa', ['Marsa is a platform for publishing listings and presenting businesses. We only display content; we are not a party to any sale and do not guarantee the accuracy of listings or the quality of what is offered.']],
      ['Account', ['You must be 18 or older, provide accurate information, keep your password secret and take responsibility for what happens through your account.']],
      ['Prohibited content', [
        'False or misleading listings, or selling what you do not own.',
        'Items and goods prohibited by Algerian law.',
        'Offensive content or impersonation of another person or business.',
        'Repeated, unwanted listings (spam) and publishing other people’s data without their permission.',
      ]],
      ['Listing limits', ['Each account has a limited number of active listings at the same time, and each listing has a set display period that can be renewed.']],
      ['Directory businesses', ['Businesses are reviewed and approved by the admin team before they appear, and may be suspended if they break these terms.']],
      ['Reporting and moderation', ['If you see a listing or business that breaks the rules, use the “Report” button. We review reports and may hide or delete any infringing content and suspend infringing accounts without prior notice.']],
      ['Liability and safety', [
        'Negotiation, payment and delivery happen directly between you and the other party, outside the app.',
        'Inspect the boat or engine yourself, check the ownership papers, and never pay a stranger in advance.',
        'We are not liable for losses arising from dealings between users, to the extent permitted by law.',
      ]],
      ['Deleting your account', ['You can delete your account at any time from “My account”.']],
      ['Governing law', ['These terms are governed by Algerian law.']],
      ['Changes', ['We may change these terms; continuing to use the app after a change means you accept the updated version.']],
      ['Contact', [SUPPORT_EMAIL]],
    ],
  },
  delete: {
    title: 'Delete your account and data',
    sections: [
      ['In the app (fastest)', [
        'Open the app and sign in.',
        'Go to “My account” and tap “Delete my account permanently”.',
        'Type the word “delete” to confirm, then tap “Confirm deletion”.',
      ]],
      ['By email', [
        `Send a request to ${SUPPORT_EMAIL} from the email registered on your account, with the subject: “Account deletion request”.`,
        'We process the request within 30 days at most.',
      ]],
      ['What is deleted', ['Your account, your profile data (name, phone, wilaya), all your listings and businesses, their photos and videos, the linked contact numbers, your favourites and your notifications.']],
      ['What may remain', [
        'Encrypted backups kept by the provider for a limited time, then deleted automatically.',
        'Reports you sent are deleted with your account.',
      ]],
    ],
  },
};

export const LEGAL_I18N = { ar: LEGAL, fr: LEGAL_FR, en: LEGAL_EN };
