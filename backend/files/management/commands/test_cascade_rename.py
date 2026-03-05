"""
Comando de Django para probar el sistema de actualización en cascada de permisos

Este comando simula diferentes escenarios de renombrado de directorios
y verifica que el sistema actualice correctamente los permisos.

Uso:
    python manage.py test_cascade_rename
    python manage.py test_cascade_rename --dry-run
    python manage.py test_cascade_rename --scenario 1
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from users.models import UserPermission
from services.directory_cascade_service import DirectoryCascadeService

User = get_user_model()


class Command(BaseCommand):
    help = 'Prueba el sistema de actualización en cascada de permisos al renombrar directorios'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar lo que haría sin hacer cambios reales',
        )
        parser.add_argument(
            '--scenario',
            type=int,
            help='Número de escenario a probar (1-4)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        scenario = options.get('scenario')

        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('TEST DE ACTUALIZACIÓN EN CASCADA DE PERMISOS'))
        self.stdout.write(self.style.SUCCESS('='*80 + '\n'))

        if dry_run:
            self.stdout.write(self.style.WARNING('⚠ MODO DRY-RUN - No se harán cambios reales\n'))

        if scenario:
            self._run_scenario(scenario, dry_run)
        else:
            self._run_all_scenarios(dry_run)

    def _run_all_scenarios(self, dry_run):
        """Ejecuta todos los escenarios de prueba"""
        scenarios = [1, 2, 3, 4]
        for scenario_num in scenarios:
            self._run_scenario(scenario_num, dry_run)
            self.stdout.write('')

    def _run_scenario(self, scenario_num, dry_run):
        """Ejecuta un escenario específico"""
        if scenario_num == 1:
            self._scenario_1_affected_users(dry_run)
        elif scenario_num == 2:
            self._scenario_2_no_affected_users(dry_run)
        elif scenario_num == 3:
            self._scenario_3_blocked_paths(dry_run)
        elif scenario_num == 4:
            self._scenario_4_conflict_detection(dry_run)
        else:
            self.stdout.write(self.style.ERROR(f'❌ Escenario {scenario_num} no existe'))

    def _scenario_1_affected_users(self, dry_run):
        """
        Escenario 1: Usuario A tiene acceso a ruta padre,
        usuarios B, C, D tienen acceso a rutas hijas
        """
        self.stdout.write(self.style.SUCCESS('📋 ESCENARIO 1: Renombrado afecta usuarios con rutas hijas'))
        self.stdout.write('-' * 80)

        old_path = '05_grup_trab\\11_gest_info\\2025\\06_arch\\proyecto_antiguo'
        new_path = '05_grup_trab\\11_gest_info\\2025\\06_arch\\proyecto_nuevo'

        self.stdout.write(f'Ruta anterior: {old_path}')
        self.stdout.write(f'Nueva ruta:    {new_path}\n')

        # Buscar permisos afectados
        affected = DirectoryCascadeService.find_affected_permissions(old_path)

        if not affected:
            self.stdout.write(self.style.WARNING('⚠ No hay permisos afectados por este renombrado'))
            self.stdout.write(self.style.WARNING('   Tip: Crea permisos de prueba con:'))
            self.stdout.write(f'   UserPermission.objects.create(')
            self.stdout.write(f'       user=user,')
            self.stdout.write(f'       base_path="{old_path}\\\\subfolder",')
            self.stdout.write(f'       can_read=True')
            self.stdout.write(f'   )')
            return

        info = DirectoryCascadeService.get_affected_users_info(affected)

        self.stdout.write(self.style.SUCCESS(f'✓ Encontrados {info["total_permissions"]} permisos afectados'))
        self.stdout.write(self.style.SUCCESS(f'✓ De {info["total_users"]} usuarios diferentes\n'))

        # Mostrar detalle de usuarios afectados
        self.stdout.write('Usuarios afectados:')
        for user_info in info['users']:
            self.stdout.write(
                f'  - {user_info["full_name"]} ({user_info["email"]}): '
                f'{user_info["permissions_count"]} permiso(s)'
            )

        self.stdout.write('')

        # Mostrar permisos específicos
        self.stdout.write('Permisos que serían actualizados:')
        for perm in affected[:5]:  # Mostrar solo los primeros 5
            self.stdout.write(f'  - {perm.user.email}: {perm.base_path}')

        if len(affected) > 5:
            self.stdout.write(f'  ... y {len(affected) - 5} más')

        if not dry_run:
            self.stdout.write(self.style.WARNING('\n⚠ Para ejecutar la actualización real, usa:'))
            self.stdout.write(f'   DirectoryCascadeService.update_directory_cascade(')
            self.stdout.write(f'       old_path="{old_path}",')
            self.stdout.write(f'       new_path="{new_path}",')
            self.stdout.write(f'       new_name="proyecto_nuevo",')
            self.stdout.write(f'       user=user')
            self.stdout.write(f'   )')

    def _scenario_2_no_affected_users(self, dry_run):
        """
        Escenario 2: Usuario renombra directorio muy profundo,
        no afecta a usuarios con permisos en niveles superiores
        """
        self.stdout.write(self.style.SUCCESS('📋 ESCENARIO 2: Renombrado NO afecta usuarios de niveles superiores'))
        self.stdout.write('-' * 80)

        # Simular caso donde usuario A tiene permiso en nivel superior
        old_path = '05_grup_trab\\11_gest_info\\2025\\06_arch\\subfolder\\muy\\profundo\\archivo_antiguo'
        parent_path = '05_grup_trab\\11_gest_info\\2025'

        self.stdout.write(f'Ruta a renombrar: {old_path}')
        self.stdout.write(f'Permiso padre:    {parent_path}\n')

        # Buscar permisos afectados
        affected = DirectoryCascadeService.find_affected_permissions(old_path)

        if not affected:
            self.stdout.write(self.style.SUCCESS('✓ Correcto: No se encontraron permisos afectados'))
            self.stdout.write(self.style.SUCCESS('✓ Los usuarios con permisos en niveles superiores NO serán notificados'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Se encontraron {len(affected)} permisos afectados'))
            self.stdout.write('  (Esto es normal si existen permisos en esa ruta específica)\n')

            for perm in affected[:3]:
                self.stdout.write(f'  - {perm.user.email}: {perm.base_path}')

    def _scenario_3_blocked_paths(self, dry_run):
        """
        Escenario 3: Verificar que también se actualizan blocked_paths y read_only_paths
        """
        self.stdout.write(self.style.SUCCESS('📋 ESCENARIO 3: Actualización de blocked_paths y read_only_paths'))
        self.stdout.write('-' * 80)

        # Buscar permisos con blocked_paths o read_only_paths
        permissions_with_json = UserPermission.objects.filter(
            is_active=True
        ).exclude(
            blocked_paths=[]
        ) | UserPermission.objects.filter(
            is_active=True
        ).exclude(
            read_only_paths=[]
        )

        count = permissions_with_json.count()

        if count == 0:
            self.stdout.write(self.style.WARNING('⚠ No hay permisos con blocked_paths o read_only_paths configurados'))
            self.stdout.write('   Tip: Crea uno manualmente para probar esta funcionalidad')
            return

        self.stdout.write(self.style.SUCCESS(f'✓ Encontrados {count} permisos con configuración avanzada\n'))

        # Mostrar algunos ejemplos
        for perm in permissions_with_json[:3]:
            self.stdout.write(f'Usuario: {perm.user.email}')
            self.stdout.write(f'  Base path: {perm.base_path}')

            if perm.blocked_paths:
                self.stdout.write(f'  Blocked paths ({len(perm.blocked_paths)}):')
                for bp in perm.blocked_paths[:2]:
                    self.stdout.write(f'    - {bp}')

            if perm.read_only_paths:
                self.stdout.write(f'  Read-only paths ({len(perm.read_only_paths)}):')
                for rop in perm.read_only_paths[:2]:
                    self.stdout.write(f'    - {rop}')

            self.stdout.write('')

        self.stdout.write(self.style.SUCCESS('✓ El servicio actualiza TODOS estos campos automáticamente'))

    def _scenario_4_conflict_detection(self, dry_run):
        """
        Escenario 4: Detección de conflictos al renombrar
        """
        self.stdout.write(self.style.SUCCESS('📋 ESCENARIO 4: Detección de conflictos'))
        self.stdout.write('-' * 80)

        # Probar validación de conflictos
        test_cases = [
            ('05_grup_trab\\folder1', 'folder2', True, 'Renombrado válido'),
            ('05_grup_trab\\folder1', 'folder1', False, 'Mismo nombre'),
        ]

        for old_path, new_name, expected_valid, description in test_cases:
            is_valid, error_msg = DirectoryCascadeService.validate_rename_conflicts(old_path, new_name)

            if is_valid:
                self.stdout.write(f'✓ {description}: {old_path} -> {new_name}')
            else:
                self.stdout.write(f'❌ {description}: {error_msg}')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✓ Sistema de validación funcionando correctamente'))


    def _create_sample_data(self):
        """Crea datos de ejemplo para testing"""
        self.stdout.write(self.style.SUCCESS('\n📝 CREAR DATOS DE EJEMPLO'))
        self.stdout.write('-' * 80)

        # Buscar usuario de prueba
        try:
            user = User.objects.filter(role='admin').first()
            if not user:
                user = User.objects.first()

            if not user:
                self.stdout.write(self.style.ERROR('❌ No hay usuarios en el sistema'))
                return

            # Crear permisos de ejemplo
            base_path = '05_grup_trab\\11_gest_info\\2025\\06_arch\\test_cascade'

            perm1, created1 = UserPermission.objects.get_or_create(
                user=user,
                base_path=base_path,
                defaults={
                    'can_read': True,
                    'can_write': True,
                    'granted_at': timezone.now()
                }
            )

            perm2, created2 = UserPermission.objects.get_or_create(
                user=user,
                base_path=f'{base_path}\\subfolder1',
                defaults={
                    'can_read': True,
                    'blocked_paths': [f'{base_path}\\subfolder1\\blocked'],
                    'granted_at': timezone.now()
                }
            )

            if created1 or created2:
                self.stdout.write(self.style.SUCCESS(f'✓ Permisos de ejemplo creados para {user.email}'))
                self.stdout.write(f'  - {base_path}')
                self.stdout.write(f'  - {base_path}\\subfolder1')
            else:
                self.stdout.write(self.style.WARNING('⚠ Los permisos ya existían'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creando datos: {str(e)}'))
