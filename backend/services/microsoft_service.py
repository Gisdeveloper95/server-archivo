"""
Servicio para integración con Microsoft Graph API
Permite subir/descargar archivos a OneDrive y obtener URLs de Office Online
"""
import msal
import requests
import logging
from django.conf import settings
from typing import Dict, Optional, BinaryIO

logger = logging.getLogger(__name__)


class MicrosoftGraphService:
    """
    Servicio para interactuar con Microsoft Graph API

    Permite:
    - Autenticación con Azure AD
    - Subir archivos a OneDrive
    - Descargar archivos de OneDrive
    - Obtener URLs de edición para Office Online
    """

    def __init__(self):
        self.client_id = getattr(settings, 'AZURE_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'AZURE_CLIENT_SECRET', None)
        self.tenant_id = getattr(settings, 'AZURE_TENANT_ID', None)

        if not all([self.client_id, self.client_secret, self.tenant_id]):
            logger.warning("Microsoft Graph credentials not configured")

        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.scope = ['https://graph.microsoft.com/.default']
        self.graph_endpoint = 'https://graph.microsoft.com/v1.0'
        self.access_token = None

    def get_access_token(self) -> str:
        """
        Obtiene un token de acceso para Microsoft Graph API

        Returns:
            str: Access token

        Raises:
            Exception: Si falla la autenticación
        """
        try:
            app = msal.ConfidentialClientApplication(
                self.client_id,
                authority=self.authority,
                client_credential=self.client_secret,
            )

            result = app.acquire_token_for_client(scopes=self.scope)

            if "access_token" in result:
                self.access_token = result['access_token']
                logger.info("Successfully obtained Microsoft Graph access token")
                return self.access_token
            else:
                error_msg = result.get('error_description', 'Unknown error')
                logger.error(f"Failed to obtain token: {error_msg}")
                raise Exception(f"Error obteniendo token de Microsoft: {error_msg}")

        except Exception as e:
            logger.error(f"Exception in get_access_token: {str(e)}")
            raise

    def upload_to_onedrive(
        self,
        file_path: str,
        file_content: bytes,
        user_email: str
    ) -> Dict:
        """
        Sube un archivo al OneDrive del usuario

        Args:
            file_path: Ruta relativa donde guardar el archivo (ej: "NetApp_Temp/documento.docx")
            file_content: Contenido del archivo en bytes
            user_email: Email corporativo del usuario

        Returns:
            Dict con información del archivo subido (id, webUrl, etc.)

        Raises:
            Exception: Si falla la subida
        """
        if not self.access_token:
            self.get_access_token()

        try:
            # URL para subir archivo a OneDrive del usuario
            upload_url = (
                f"{self.graph_endpoint}/users/{user_email}/drive/root:"
                f"/{file_path}:/content"
            )

            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/octet-stream'
            }

            logger.info(f"Uploading file to OneDrive: {file_path} for user {user_email}")

            response = requests.put(
                upload_url,
                headers=headers,
                data=file_content,
                timeout=60
            )

            if response.status_code in [200, 201]:
                data = response.json()
                logger.info(f"File uploaded successfully: {data.get('id')}")
                return data
            else:
                error_msg = response.text
                logger.error(f"Failed to upload file: {error_msg}")
                raise Exception(f"Error subiendo archivo a OneDrive: {error_msg}")

        except Exception as e:
            logger.error(f"Exception in upload_to_onedrive: {str(e)}")
            raise

    def get_edit_url(self, item_id: str, user_email: str) -> str:
        """
        Obtiene la URL para editar un archivo en Office Online

        Args:
            item_id: ID del archivo en OneDrive
            user_email: Email del usuario

        Returns:
            str: URL de edición en Office Online

        Raises:
            Exception: Si falla la obtención de URL
        """
        if not self.access_token:
            self.get_access_token()

        try:
            url = f"{self.graph_endpoint}/users/{user_email}/drive/items/{item_id}"
            headers = {'Authorization': f'Bearer {self.access_token}'}

            logger.info(f"Getting edit URL for item: {item_id}")

            response = requests.get(url, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                web_url = data.get('webUrl')
                logger.info(f"Edit URL obtained: {web_url}")
                return web_url
            else:
                error_msg = response.text
                logger.error(f"Failed to get edit URL: {error_msg}")
                raise Exception(f"Error obteniendo URL de edición: {error_msg}")

        except Exception as e:
            logger.error(f"Exception in get_edit_url: {str(e)}")
            raise

    def download_from_onedrive(self, item_id: str, user_email: str) -> bytes:
        """
        Descarga un archivo desde OneDrive del usuario

        Args:
            item_id: ID del archivo en OneDrive
            user_email: Email del usuario

        Returns:
            bytes: Contenido del archivo

        Raises:
            Exception: Si falla la descarga
        """
        if not self.access_token:
            self.get_access_token()

        try:
            download_url = (
                f"{self.graph_endpoint}/users/{user_email}/drive/items/{item_id}/content"
            )
            headers = {'Authorization': f'Bearer {self.access_token}'}

            logger.info(f"Downloading file from OneDrive: {item_id}")

            response = requests.get(
                download_url,
                headers=headers,
                timeout=60
            )

            if response.status_code == 200:
                logger.info(f"File downloaded successfully: {len(response.content)} bytes")
                return response.content
            else:
                error_msg = response.text
                logger.error(f"Failed to download file: {error_msg}")
                raise Exception(f"Error descargando archivo de OneDrive: {error_msg}")

        except Exception as e:
            logger.error(f"Exception in download_from_onedrive: {str(e)}")
            raise

    def delete_from_onedrive(self, item_id: str, user_email: str) -> bool:
        """
        Elimina un archivo temporal de OneDrive

        Args:
            item_id: ID del archivo en OneDrive
            user_email: Email del usuario

        Returns:
            bool: True si se eliminó exitosamente
        """
        if not self.access_token:
            self.get_access_token()

        try:
            delete_url = f"{self.graph_endpoint}/users/{user_email}/drive/items/{item_id}"
            headers = {'Authorization': f'Bearer {self.access_token}'}

            logger.info(f"Deleting file from OneDrive: {item_id}")

            response = requests.delete(delete_url, headers=headers, timeout=30)

            if response.status_code == 204:
                logger.info("File deleted successfully from OneDrive")
                return True
            else:
                logger.warning(f"Failed to delete file: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Exception in delete_from_onedrive: {str(e)}")
            return False

    def get_file_info(self, item_id: str, user_email: str) -> Optional[Dict]:
        """
        Obtiene información de un archivo en OneDrive

        Args:
            item_id: ID del archivo
            user_email: Email del usuario

        Returns:
            Dict con información del archivo o None si falla
        """
        if not self.access_token:
            self.get_access_token()

        try:
            url = f"{self.graph_endpoint}/users/{user_email}/drive/items/{item_id}"
            headers = {'Authorization': f'Bearer {self.access_token}'}

            response = requests.get(url, headers=headers, timeout=30)

            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Failed to get file info: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"Exception in get_file_info: {str(e)}")
            return None
